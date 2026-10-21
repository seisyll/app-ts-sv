<script lang="ts">
	import { onMount } from 'svelte'

	/* ―― » billing-app's network globe: a golden-angle point cloud on a sphere, three
	        precessing orbit rings and comets inside the rim, drawn on a transparent canvas.
	        Pauses off screen; with reduced motion it draws one still frame. Decorative. */

	let canvas = $state<HTMLCanvasElement>()

	const COLORS = {
		glowCore : 'rgba(86, 231, 209, 0.20)',
		glowMid  : 'rgba(42, 128, 116, 0.12)',
		dotDim   : [ 34, 120, 110 ],
		dotBright: [ 140, 240, 224 ],
		nodeRing : 'rgba(190, 247, 238, 0.55)',
		nodeFill : 'rgba(86, 231, 209, 0.9)',
		comet    : [ 86, 231, 209 ],
		cometHead: [ 224, 252, 247 ],
		orbit    : [ 86, 231, 209 ]
	}

	type Point = { x : number, y : number, z : number }
	type Comet = { start : { x : number, y : number }, end : { x : number, y : number }, progress : number, speed : number, trail : number }

	const rotateX = ( p : Point, a : number ) : Point => ( { x: p.x, y: p.y * Math.cos( a ) - p.z * Math.sin( a ), z: p.y * Math.sin( a ) + p.z * Math.cos( a ) } )
	const rotateY = ( p : Point, a : number ) : Point => ( { x: p.x * Math.cos( a ) - p.z * Math.sin( a ), y: p.y, z: p.x * Math.sin( a ) + p.z * Math.cos( a ) } )
	const lerp = ( a : number, b : number, t : number ) => a + ( b - a ) * t
	const rgba = ( [ r, g, b ] : number[], alpha : number ) => `rgba(${ r },${ g },${ b },${ alpha })`

	onMount( () => {
		const ctx = canvas!.getContext( '2d' )!
		const still = matchMedia( '(prefers-reduced-motion: reduce)' ).matches
		let width = 0, height = 0, cx = 0, cy = 0, radius = 0

		const resize = () => {
			const dpr = Math.min( devicePixelRatio || 1, 2 )

			width = canvas!.clientWidth || 520
			height = canvas!.clientHeight || 520
			canvas!.width = width * dpr
			canvas!.height = height * dpr
			ctx.setTransform( dpr, 0, 0, dpr, 0, 0 )
			cx = width / 2
			cy = height / 2
			radius = Math.min( width, height ) * 0.3
		}

		const DOTS = 230
		const golden = Math.PI * ( 3 - Math.sqrt( 5 ) )
		const dots = Array.from( { length: DOTS }, ( _, i ) => {
			const y = 1 - ( i / ( DOTS - 1 ) ) * 2
			const ring = Math.sqrt( 1 - y * y )

			return { x: Math.cos( golden * i ) * ring, y, z: Math.sin( golden * i ) * ring, isNode: Math.random() < 0.16, size: 0.7 + Math.random() * 0.6, twinkle: Math.random() * Math.PI * 2 }
		} )

		const SEGMENTS = 96
		const TILT = 0.18
		const orbits = [
			{ incl: 0.25, node: 0.4, speed: 0.0011, scale: 1.06, alpha: 0.38 },
			{ incl: 1.05, node: 2.1, speed: -0.0009, scale: 1.16, alpha: 0.36 },
			{ incl: 0.65, node: 4.2, speed: 0.0008, scale: 1.26, alpha: 0.34 }
		]
		let spin = 0
		let comets : Comet[] = []
		let nextComet = 800

		// Turn a point on the unit sphere into screen space, with the globe's spin and tilt.
		const project = ( p : Point, scale = 1 ) => {
			const x = p.x * Math.cos( spin ) - p.z * Math.sin( spin )
			const z = p.x * Math.sin( spin ) + p.z * Math.cos( spin )

			return { sx: cx + x * radius * scale, sy: cy + ( p.y * Math.cos( TILT ) - z * Math.sin( TILT ) ) * radius * scale, z: p.y * Math.sin( TILT ) + z * Math.cos( TILT ) }
		}

		const spawnComet = () => {
			const angle = Math.random() * Math.PI * 2
			const dir = { x: Math.cos( angle ), y: Math.sin( angle ) }
			const offset = ( Math.random() - 0.5 ) * 2 * radius * 0.75
			const half = Math.sqrt( Math.max( radius * radius - offset * offset, 0 ) )
			const mid = { x: cx - dir.y * offset, y: cy + dir.x * offset }

			comets.push( {
				start   : { x: mid.x - dir.x * half, y: mid.y - dir.y * half },
				end     : { x: mid.x + dir.x * half, y: mid.y + dir.y * half },
				progress: 0,
				speed   : 0.00035 + Math.random() * 0.00035,
				trail   : 0.18 + Math.random() * 0.08
			} )
		}

		const draw = ( time : number ) => {
			ctx.clearRect( 0, 0, width, height )

			const glow = ctx.createRadialGradient( cx, cy, 0, cx, cy, radius * 1.3 )

			glow.addColorStop( 0, COLORS.glowCore )
			glow.addColorStop( 0.55, COLORS.glowMid )
			glow.addColorStop( 1, 'rgba(0,0,0,0)' )
			ctx.fillStyle = glow
			ctx.fillRect( 0, 0, width, height )

			for ( const orbit of orbits ) {
				let previous : { sx : number, sy : number } | undefined

				for ( let i = 0; i <= SEGMENTS; i++ ) {
					const a = ( i / SEGMENTS ) * Math.PI * 2
					const point = project( rotateY( rotateX( { x: Math.cos( a ), y: 0, z: Math.sin( a ) }, orbit.incl ), orbit.node ), orbit.scale )

					if ( previous ) {
						ctx.beginPath()
						ctx.moveTo( previous.sx, previous.sy )
						ctx.lineTo( point.sx, point.sy )
						ctx.strokeStyle = rgba( COLORS.orbit, 0.04 + ( ( point.z + 1 ) / 2 ) * orbit.alpha )
						ctx.lineWidth = 1
						ctx.stroke()
					}

					previous = point
				}
			}

			// Back to front, so near dots paint over far ones.
			for ( const { sx, sy, z, dot } of dots.map( ( dot ) => ( { ...project( dot ), dot } ) ).sort( ( a, b ) => a.z - b.z ) ) {
				const depth = ( z + 1 ) / 2

				ctx.beginPath()

				if ( dot.isNode ) {
					const pulse = 0.7 + 0.3 * Math.sin( time * 0.002 + dot.twinkle )

					ctx.arc( sx, sy, ( 3.4 + depth * 1.6 ) * pulse, 0, Math.PI * 2 )
					ctx.strokeStyle = COLORS.nodeRing
					ctx.lineWidth = 1
					ctx.stroke()
					ctx.beginPath()
					ctx.arc( sx, sy, 1.6 * pulse + depth, 0, Math.PI * 2 )
					ctx.fillStyle = COLORS.nodeFill
				} else {
					ctx.arc( sx, sy, dot.size * ( 0.6 + depth * 0.7 ), 0, Math.PI * 2 )
					ctx.fillStyle = rgba( depth > 0.5 ? COLORS.dotBright : COLORS.dotDim, 0.18 + depth * 0.75 )
				}

				ctx.fill()
			}

			comets = comets.filter( ( comet ) => comet.progress < 1.1 )

			for ( const comet of comets ) {
				comet.progress += comet.speed * 16

				const at = ( t : number ) => { const c = Math.min( Math.max( t, 0 ), 1 ); return { x: lerp( comet.start.x, comet.end.x, c ), y: lerp( comet.start.y, comet.end.y, c ) } }
				const head = at( comet.progress )
				const tail = at( comet.progress - comet.trail )
				const fade = comet.progress < 0.12 ? comet.progress / 0.12 : comet.progress > 0.85 ? Math.max( 0, ( 1.1 - comet.progress ) / 0.25 ) : 1
				const trail = ctx.createLinearGradient( tail.x, tail.y, head.x, head.y )

				trail.addColorStop( 0, 'rgba(0,0,0,0)' )
				trail.addColorStop( 1, rgba( COLORS.comet, 0.55 * fade ) )
				ctx.strokeStyle = trail
				ctx.lineWidth = 1.2
				ctx.beginPath()
				ctx.moveTo( tail.x, tail.y )
				ctx.lineTo( head.x, head.y )
				ctx.stroke()
				ctx.beginPath()
				ctx.arc( head.x, head.y, 1.6, 0, Math.PI * 2 )
				ctx.fillStyle = rgba( COLORS.cometHead, 0.95 * fade )
				ctx.fill()
			}

			if ( time > nextComet && comets.length < 4 ) {
				spawnComet()
				nextComet = time + 500 + Math.random() * 900
			}

			spin += 0.0017

			for ( const orbit of orbits )
				orbit.node += orbit.speed
		}

		let frame = 0
		let visible = false
		const loop = ( time : number ) => {
			draw( time )
			frame = visible ? requestAnimationFrame( loop ) : 0
		}
		const onResize = () => {
			resize()

			if ( still )
				draw( 0 )
		}

		resize()

		if ( still ) {
			draw( 0 )
			addEventListener( 'resize', onResize )

			return () => removeEventListener( 'resize', onResize )
		}

		// Only animate while on screen.
		const observer = new IntersectionObserver( ( [ entry ] ) => {
			visible = entry.isIntersecting

			if ( visible && !frame )
				frame = requestAnimationFrame( loop )
		} )

		observer.observe( canvas! )
		addEventListener( 'resize', onResize )

		return () => {
			observer.disconnect()
			cancelAnimationFrame( frame )
			removeEventListener( 'resize', onResize )
		}
	} )
</script>

<canvas bind:this={canvas} aria-hidden="true" class="block h-[clamp(330px,46vw,580px)] w-full"></canvas>
