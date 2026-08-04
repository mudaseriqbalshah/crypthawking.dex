import { FarmV4SupportedChainId } from '@pancakeswap/farms'
import { getCorsHeaders, handleCors } from 'edge/cors'
import { NextRequest, NextResponse } from 'next/server'
import edgeFarmQueries from 'state/farmsV4/search/edgeFarmQueries'
import { parseFarmSearchQuery } from 'state/farmsV4/search/farm.util'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: NextRequest) {
  const cors = handleCors(req)
  if (cors) {
    return cors
  }
  const raw = new URL(req.url).search.slice(1)
  try {
    const query = parseFarmSearchQuery(raw)

    const pools = await edgeFarmQueries.queryFarms({
      extend: query.extend,
      protocols: query.protocols || [],
      address: query.address,
      chains: query.chains as FarmV4SupportedChainId[],
    })

    return NextResponse.json(
      {
        data: pools,
        lastUpdated: Number(Date.now()),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': `public, s-maxage=120, stale-while-revalidate=180`,
          'Content-Type': 'application/json',
          ...getCorsHeaders(req),
        },
      },
    )
  } catch (ex) {
    console.error(ex)
    return NextResponse.json({ error: `search farms error ` }, { status: 400, headers: getCorsHeaders(req) })
  }
}
