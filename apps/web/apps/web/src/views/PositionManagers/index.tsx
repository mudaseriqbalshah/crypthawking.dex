import { Box, useMatchBreakpoints } from '@pancakeswap/uikit'
import Page from 'components/Layout/Page'
import { Header } from './components'
import SunsetWarning from './components/SunsetWarning'
import { Controls, VaultContent } from './containers'

export function PositionManagers() {
  const { isMobile } = useMatchBreakpoints()
  return (
    <>
      <Header />

      <Page>
        <Box
          width="100%"
          style={{
            marginTop: isMobile ? '-20px' : '-60px',
          }}
          m="auto"
        >
          <SunsetWarning />
        </Box>
        <Controls />
        <VaultContent />
      </Page>
    </>
  )
}
