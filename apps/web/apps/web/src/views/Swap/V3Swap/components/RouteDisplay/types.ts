import { Route } from '@pancakeswap/smart-router'

export type RouteDisplayEssentials = Pick<Route, 'path' | 'pools' | 'inputAmount' | 'outputAmount' | 'percent' | 'type'>
