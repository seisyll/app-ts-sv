"""―― » Name the graph's communities, then rewrite the report and graph.html with them.
        build.py keeps names across rebuilds; this is for new or badly named ones.

          python scripts/graphify/label.py                 every community: size, name, top nodes
          python scripts/graphify/label.py names.json      apply { "<community>": "Name", … }
"""

import collections
import json
import sys
from pathlib import Path

sys.path.insert( 0, str( Path( __file__ ).parent ) )

# build first: it explains a missing or changed graphify ( networkx comes with it ).
from build import OUT, ROOT, write_outputs  # noqa: E402
from graphify.detect import detect  # noqa: E402
from networkx.readwrite import json_graph  # noqa: E402


def main() -> None:
	if not ( OUT / 'labels.json' ).exists():
		sys.exit( 'No graph yet: run python scripts/graphify/build.py first.' )

	G =json_graph.node_link_graph( json.loads( ( OUT / 'graph.json' ).read_text( encoding='utf-8' ) ), edges='links' )
	communities = collections.defaultdict( list )

	for node, data in G.nodes( data=True ):
		communities[ data.get( 'community' ) ].append( node )

	labels = { int( k ): v for k, v in json.loads( ( OUT / 'labels.json' ).read_text( encoding='utf-8' ) ).items() }

	if len( sys.argv ) < 2:
		for cid, ids in sorted( communities.items(), key=lambda item: -len( item[ 1 ] ) ):
			top = sorted( ids, key=G.degree, reverse=True )[ :6 ]
			print( cid, len( ids ), labels.get( cid, '' ), '|', ', '.join( str( G.nodes[ i ].get( 'label' ) ) for i in top ) )
		return

	labels.update( { int( k ): v for k, v in json.loads( Path( sys.argv[ 1 ] ).read_text( encoding='utf-8' ) ).items() } )
	write_outputs( G, dict( communities ), labels, detect( ROOT ) )
	print( 'named' )


if __name__ == '__main__':
	main()
