<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js'
	import type { Customer } from '../../demo-data'
	import { statusLabel } from './labels'

	let { status } : { status : Customer['status'] } = $props()

	const variant = { active: 'default', trial: 'secondary', churned: 'outline' } as const
</script>

<Badge variant={variant[ status ]}>{statusLabel( status )}</Badge>
