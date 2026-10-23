"""―― » Rebuild graphify-out/ from graphify's caches, with two fixes stock graphify lacks.
        No LLM: code goes through graphify's AST extractor, docs come from the extractions
        /graphify already cached ( run `/graphify . --update` first when docs changed ).

          python scripts/graphify/build.py

        1. package.json "imports" ( #lib/*, #config/*, #theme ). graphify resolves tsconfig
           paths only, so '#lib/server/forms.js' fell back to its last segment and became
           the same node as '#lib/forms.js' — and neither reached the real file.
        2. Doc references to files. The doc agents name a mentioned file by its stem
           ( `kit` for config/kit.ts ), which is also the id of a package import
           ( @sveltejs/kit ). Each one is pointed at the file's real id, in the cache.

        Community names carry over from the last build by overlap; new ones are named after
        their busiest node until scripts/graphify/label.py names them.
"""

import collections
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import graphify.extract as gx
from graphify.analyze import god_nodes, suggest_questions, surprising_connections
from graphify.build import build_from_json
from graphify.cache import check_semantic_cache
from graphify.cluster import cluster, score_all
from graphify.detect import detect, save_manifest
from graphify.export import to_html, to_json
from graphify.report import generate

ROOT = Path( __file__ ).resolve().parents[ 2 ]
OUT = ROOT / 'graphify-out'
IMPORTS = json.loads( ( ROOT / 'package.json' ).read_text( encoding='utf-8' ) )[ 'imports' ]
CORPUS = set()


# ―― 1. #-imports ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――

_resolve = gx._resolve_js_module_path


def resolve( raw, start_dir=None ):
	if isinstance( raw, str ) and raw.startswith( '#' ):
		for key, target in IMPORTS.items():
			if key.endswith( '/*' ) and raw.startswith( key[ :-1 ] ):
				return gx._resolve_js_import_path( ROOT / target[ :-1 ] / raw[ len( key ) - 1: ] )
			if raw == key:
				return gx._resolve_js_import_path( ROOT / target )
	return _resolve( raw, start_dir )


# .svelte files resolve imports on their own ( tsconfig paths only ): point their #-stubs at
# the same file ids. Stubs for files outside the corpus ( the vendored ui/, generated
# paraglide ) stay, under their full path so they can't collide.
_svelte = gx._DISPATCH[ '.svelte' ]


def svelte( path ):
	result = _svelte( path )
	remap, keep = {}, []

	for node in result.get( 'nodes', [] ):
		label = str( node.get( 'label', '' ) )
		target = resolve( label ) if label.startswith( '#' ) else None

		if target is not None:
			remap[ node[ 'id' ] ] = gx._make_id( str( target ) )

			if str( target ) in CORPUS:
				continue

			node = { **node, 'id': remap[ node[ 'id' ] ], 'source_file': str( target ) }

		keep.append( node )

	result[ 'nodes' ] = keep

	for edge in result.get( 'edges', [] ):
		edge[ 'target' ] = remap.get( edge[ 'target' ], edge[ 'target' ] )

	return result


gx._resolve_js_module_path = resolve
gx._DISPATCH[ '.svelte' ] = svelte


# ―― 2. Doc references ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――

FILE_LABEL = re.compile( r'[\w.\-()\[\]+@/]+\.\w+' )


def fix_doc_references() -> int:
	fixed = 0

	for cached in ( OUT / 'cache' / 'semantic' ).glob( '*.json' ):
		data = json.loads( cached.read_text( encoding='utf-8' ) )
		remap = {}

		for node in data.get( 'nodes', [] ):
			label = ( node.get( 'label' ) or '' ).strip().strip( '`' )

			if FILE_LABEL.fullmatch( label ) and '/' in label and ( ROOT / label ).is_file() and node[ 'id' ] != gx._make_id( label ):
				remap[ node[ 'id' ] ] = gx._make_id( label )

		if not remap:
			continue

		seen, nodes = set(), []

		for node in data[ 'nodes' ]:
			node[ 'id' ] = remap.get( node[ 'id' ], node[ 'id' ] )

			if node[ 'id' ] not in seen:
				seen.add( node[ 'id' ] )
				nodes.append( node )

		data[ 'nodes' ] = nodes

		for edge in data.get( 'edges', [] ):
			edge[ 'source' ] = remap.get( edge[ 'source' ], edge[ 'source' ] )
			edge[ 'target' ] = remap.get( edge[ 'target' ], edge[ 'target' ] )

		for hyperedge in data.get( 'hyperedges', [] ):
			hyperedge[ 'nodes' ] = [ remap.get( node, node ) for node in hyperedge[ 'nodes' ] ]

		cached.write_text( json.dumps( data, ensure_ascii=False ), encoding='utf-8' )
		fixed += len( remap )

	return fixed


# ―― Labels ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――

def previous_labels() -> tuple[ dict, dict ]:
	graph, labels = OUT / 'graph.json', OUT / 'labels.json'

	if not graph.exists() or not labels.exists():
		return {}, {}

	old = json.loads( graph.read_text( encoding='utf-8' ) )

	return { node[ 'id' ]: node.get( 'community' ) for node in old[ 'nodes' ] }, { int( k ): v for k, v in json.loads( labels.read_text( encoding='utf-8' ) ).items() }


def name_communities( G, communities, old_community, old_labels ) -> dict:
	labels, used = {}, collections.Counter()

	for cid, ids in communities.items():
		votes = collections.Counter( old_community.get( i ) for i in ids if old_community.get( i ) in old_labels )
		best = votes.most_common( 1 )

		# Half the members came from one named community: it keeps that name.
		if best and best[ 0 ][ 1 ] * 2 >= len( ids ):
			name = old_labels[ best[ 0 ][ 0 ] ]
			used[ name ] += 1
			labels[ cid ] = name if used[ name ] == 1 else f'{ name } { used[ name ] }'
			continue

		top = max( ids, key=G.degree )
		folder = Path( G.nodes[ top ].get( 'source_file' ) or '' ).parent.name
		labels[ cid ] = str( G.nodes[ top ].get( 'label', top ) ) + ( f' ({ folder })' if folder else '' )

	return labels


def write_outputs( G, communities, labels, detection ) -> None:
	cost = OUT / 'cost.json'
	tokens = json.loads( cost.read_text( encoding='utf-8' ) )[ 'total_input_tokens' ] if cost.exists() else 0
	report = generate( G, communities, score_all( G, communities ), labels, god_nodes( G ), surprising_connections( G, communities ), detection, { 'input': tokens, 'output': 0 }, str( ROOT ), suggested_questions=suggest_questions( G, communities, labels ) )

	( OUT / 'GRAPH_REPORT.md' ).write_text( report, encoding='utf-8' )
	( OUT / 'labels.json' ).write_text( json.dumps( { str( k ): v for k, v in labels.items() }, indent=1, ensure_ascii=False ), encoding='utf-8' )
	to_html( G, communities, str( OUT / 'graph.html' ), community_labels=labels )


# ―― Build ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――

def main() -> None:
	sys.stdout.reconfigure( encoding='utf-8' )  # Windows consoles default to a legacy code page
	os.chdir( ROOT )
	OUT.mkdir( exist_ok=True )

	detection = detect( ROOT )
	code = detection[ 'files' ][ 'code' ]
	CORPUS.update( str( Path( f ) ) for f in code )

	print( f'{ fix_doc_references() } doc references pointed at their files' )

	# Every code file again: a cached result from stock graphify would bring the collisions back.
	for cached in ( OUT / 'cache' / 'ast' ).glob( '*.json' ):
		cached.unlink()

	ast = gx.extract( [ Path( f ) for f in code ], parallel=False )
	docs = [ f for kind, files in detection[ 'files' ].items() if kind != 'code' for f in files ]
	nodes, edges, hyperedges, missing = check_semantic_cache( docs )

	if missing:
		print( f'{ len( missing ) } doc(s) not extracted yet, left out — run `/graphify . --update`, then this again:' )
		print( '\n'.join( f'  { f }' for f in missing ) )

	seen = { node[ 'id' ] for node in ast[ 'nodes' ] }
	merged = list( ast[ 'nodes' ] ) + [ node for node in nodes if node[ 'id' ] not in seen and not seen.add( node[ 'id' ] ) ]
	G = build_from_json( { 'nodes': merged, 'edges': ast[ 'edges' ] + edges, 'hyperedges': hyperedges } )

	if not G.number_of_nodes():
		sys.exit( 'The graph is empty: nothing was extracted.' )

	communities = cluster( G )
	labels = name_communities( G, communities, *previous_labels() )

	( OUT / 'graph.json' ).unlink( missing_ok=True )  # to_json won't overwrite a larger graph
	to_json( G, communities, str( OUT / 'graph.json' ) )
	write_outputs( G, communities, labels, detection )
	save_manifest( detection[ 'files' ] )

	print( f'{ G.number_of_nodes() } nodes, { G.number_of_edges() } edges, { len( communities ) } communities ( { datetime.now( timezone.utc ):%H:%M } UTC )' )


if __name__ == '__main__':
	main()
