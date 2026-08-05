import {
  Box,
  Card,
  CardBody,
  CardHeader,
  CopyButton,
  Flex,
  Heading,
  Link,
  LinkExternal,
  Text,
} from '@pancakeswap/uikit'
import { NextLinkFromReactRouter } from '@pancakeswap/widgets-internal'
import Head from 'next/head'
import { styled } from 'styled-components'
import { ADDRESS_GROUPS } from './addresses'
import {
  CHAIN_ID,
  CONTACT_EMAIL,
  FAQS,
  GITHUB_URL,
  INSTAGRAM_URL,
  RPC_URL,
  STRUCTURED_DATA,
  TELEGRAM_URL,
  TOKENLIST_URL,
  WHATSAPP_DISPLAY,
  WHATSAPP_URL,
} from './structuredData'

const EXPLORER_BASE = 'https://sepolia.basescan.org/address/'

const Section = styled(Box)`
  margin-bottom: 32px;
`

const AddressRow = styled(Flex)`
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.cardBorder};
  &:last-child {
    border-bottom: none;
  }
`

const StepList = styled.ol`
  margin: 0;
  padding-left: 20px;
  li {
    margin-bottom: 20px;
    color: ${({ theme }) => theme.colors.text};
  }
`

const InlineLinks = styled(Flex)`
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 6px;
`

const InternalLink = styled(NextLinkFromReactRouter)`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 14px;
  font-weight: 600;
  &:hover {
    text-decoration: underline;
  }
`

const shorten = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`

const ContactLinks: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <Flex flexDirection={compact ? ['column', null, 'row'] : 'column'} style={{ gap: compact ? '16px' : '10px' }}>
    <Flex alignItems="center" style={{ gap: '6px' }}>
      <Text fontSize="14px" color="textSubtle">
        Email:
      </Text>
      <Link href={`mailto:${CONTACT_EMAIL}`} fontSize="14px" external>
        {CONTACT_EMAIL}
      </Link>
    </Flex>
    <Flex alignItems="center" style={{ gap: '6px' }}>
      <Text fontSize="14px" color="textSubtle">
        WhatsApp:
      </Text>
      <LinkExternal href={WHATSAPP_URL} fontSize="14px">
        {WHATSAPP_DISPLAY}
      </LinkExternal>
    </Flex>
    <Flex alignItems="center" style={{ gap: '6px' }}>
      <Text fontSize="14px" color="textSubtle">
        Telegram:
      </Text>
      <LinkExternal href={TELEGRAM_URL} fontSize="14px">
        t.me/cryptohawking
      </LinkExternal>
    </Flex>
    <Flex alignItems="center" style={{ gap: '6px' }}>
      <Text fontSize="14px" color="textSubtle">
        Instagram:
      </Text>
      <LinkExternal href={INSTAGRAM_URL} fontSize="14px">
        @cryptohawkingofficial
      </LinkExternal>
    </Flex>
  </Flex>
)

const Developers: React.FC = () => {
  return (
    <>
      <Head>
        {STRUCTURED_DATA.map((schema) => (
          <script
            key={(schema as any)['@type']}
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </Head>

      <Box maxWidth="1200px" margin="0 auto" px={['16px', null, '24px']} py="24px">
        {/* HERO */}
        <Section>
          <Heading as="h1" scale="xl" mb="12px">
            Launch your own test token on Base Sepolia
          </Heading>
          <Text color="textSubtle" maxWidth="820px">
            CryptoHawking DEX is a free, testnet-only decentralised exchange running on Base Sepolia (chain ID{' '}
            {CHAIN_ID}). No real funds are ever involved — every asset here is a valueless test token. Deploy your own
            ERC-20, spin up a v2 pair or a v3 concentrated-liquidity pool, seed it with liquidity, farm it and trade it,
            all in a few minutes and all for the cost of free faucet gas. It is the fastest way to rehearse a token
            launch, test a trading integration or demo a DeFi product before you go anywhere near mainnet.
          </Text>
        </Section>

        {/* CONTACT — near top */}
        <Section>
          <Card>
            <CardBody>
              <Heading as="h2" scale="md" mb="4px">
                Want to launch your own token, DEX, or app? Get in touch.
              </Heading>
              <Text color="textSubtle" fontSize="14px" mb="12px">
                We build DEXes, token launches, smart contracts and web &amp; mobile apps.
              </Text>
              <ContactLinks compact />
            </CardBody>
          </Card>
        </Section>

        {/* STEPS */}
        <Section>
          <Heading as="h2" scale="lg" mb="16px">
            How to launch a test token, step by step
          </Heading>
          <Card>
            <CardBody>
              <StepList>
                <li>
                  <Text bold>Get Base Sepolia gas ETH.</Text>
                  <Text fontSize="14px" color="textSubtle">
                    Testnet ETH is free. Claim it from either public faucet, then make sure your wallet is on Base
                    Sepolia.
                  </Text>
                  <InlineLinks>
                    <LinkExternal href="https://portal.cdp.coinbase.com/products/faucet" fontSize="14px">
                      Coinbase faucet
                    </LinkExternal>
                    <LinkExternal href="https://www.alchemy.com/faucets/base-sepolia" fontSize="14px">
                      Alchemy faucet
                    </LinkExternal>
                  </InlineLinks>
                </li>
                <li>
                  <Text bold>Claim free CryptoHawking test tokens.</Text>
                  <Text fontSize="14px" color="textSubtle">
                    One claim() call drips HAWK, tUSDC, tUSDT, tDAI and tWBTC. 24 hour cooldown. You will want these as
                    the other side of your pool.
                  </Text>
                  <InlineLinks>
                    <InternalLink to="/faucet">
                      Open the faucet
                    </InternalLink>
                  </InlineLinks>
                </li>
                <li>
                  <Text bold>Deploy your ERC-20 on Base Sepolia.</Text>
                  <Text fontSize="14px" color="textSubtle">
                    Any standard ERC-20 works. Paste a token contract into Remix, compile, and deploy with
                    &ldquo;Injected Provider&rdquo; on chain {CHAIN_ID}. Our repo contains a reference TestERC20 you can
                    copy, plus every deployment script behind this DEX.
                  </Text>
                  <InlineLinks>
                    <LinkExternal href="https://remix.ethereum.org" fontSize="14px">
                      Remix IDE
                    </LinkExternal>
                    <LinkExternal href={GITHUB_URL} fontSize="14px">
                      GitHub — reference TestERC20
                    </LinkExternal>
                  </InlineLinks>
                </li>
                <li>
                  <Text bold>Create a pool for your token.</Text>
                  <Text fontSize="14px" color="textSubtle">
                    For a classic constant-product market, call addLiquidity on the HawkingRouter — the pair is created
                    automatically on first add. For concentrated liquidity, mint a position through the v3
                    NonfungiblePositionManager. Both are permissionless and both are wired into the UI.
                  </Text>
                  <InlineLinks>
                    <InternalLink to="/liquidity/positions">
                      My positions
                    </InternalLink>
                    <InternalLink to="/add">
                      Add liquidity
                    </InternalLink>
                  </InlineLinks>
                </li>
                <li>
                  <Text bold>Trade it.</Text>
                  <Text fontSize="14px" color="textSubtle">
                    Head to the swap page and use &ldquo;import token by address&rdquo; — paste your contract address
                    and your token shows up ready to route through its new pool.
                  </Text>
                  <InlineLinks>
                    <InternalLink to="/swap">
                      Go to swap
                    </InternalLink>
                  </InlineLinks>
                </li>
              </StepList>
            </CardBody>
          </Card>
        </Section>

        {/* NETWORK */}
        <Section>
          <Heading as="h2" scale="lg" mb="16px">
            Network details
          </Heading>
          <Card>
            <CardBody>
              <AddressRow>
                <Text fontSize="14px">Network</Text>
                <Text fontSize="14px" bold>
                  Base Sepolia (testnet only)
                </Text>
              </AddressRow>
              <AddressRow>
                <Text fontSize="14px">Chain ID</Text>
                <Flex alignItems="center">
                  <Text fontSize="14px" bold mr="4px">
                    {CHAIN_ID}
                  </Text>
                  <CopyButton text={String(CHAIN_ID)} tooltipMessage="Copied" width="14px" />
                </Flex>
              </AddressRow>
              <AddressRow>
                <Text fontSize="14px">RPC URL</Text>
                <Flex alignItems="center">
                  <LinkExternal href={RPC_URL} fontSize="12px" mr="4px">
                    {RPC_URL}
                  </LinkExternal>
                  <CopyButton text={RPC_URL} tooltipMessage="Copied" width="14px" />
                </Flex>
              </AddressRow>
              <AddressRow>
                <Text fontSize="14px">Explorer</Text>
                <LinkExternal href="https://sepolia.basescan.org" fontSize="12px">
                  sepolia.basescan.org
                </LinkExternal>
              </AddressRow>
              <AddressRow>
                <Text fontSize="14px">Token list</Text>
                <Flex alignItems="center">
                  <LinkExternal href={TOKENLIST_URL} fontSize="12px" mr="4px">
                    cryptohawking.tokenlist.json
                  </LinkExternal>
                  <CopyButton text={TOKENLIST_URL} tooltipMessage="Copied" width="14px" />
                </Flex>
              </AddressRow>
              <AddressRow>
                <Text fontSize="14px">Source code</Text>
                <LinkExternal href={GITHUB_URL} fontSize="12px">
                  GitHub
                </LinkExternal>
              </AddressRow>
            </CardBody>
          </Card>
        </Section>

        {/* ADDRESSES */}
        <Section>
          <Heading as="h2" scale="lg" mb="8px">
            Contract addresses
          </Heading>
          <Text color="textSubtle" fontSize="14px" mb="16px">
            Every contract below is a fresh CryptoHawking deployment on Base Sepolia. Verified on Basescan.
          </Text>
          <Flex flexDirection="column" style={{ gap: '16px' }}>
            {ADDRESS_GROUPS.map((group) => (
              <Card key={group.title}>
                <CardHeader>
                  <Heading as="h3" scale="md">
                    {group.title}
                  </Heading>
                  <Text fontSize="12px" color="textSubtle">
                    {group.description}
                  </Text>
                </CardHeader>
                <CardBody>
                  {group.entries.map((entry) => (
                    <AddressRow key={entry.label}>
                      <Text fontSize="14px">{entry.label}</Text>
                      <Flex alignItems="center">
                        {entry.isHash ? (
                          <Text fontSize="12px" color="textSubtle" mr="4px">
                            {shorten(entry.address)}
                          </Text>
                        ) : (
                          <LinkExternal href={`${EXPLORER_BASE}${entry.address}`} fontSize="12px" mr="4px">
                            {shorten(entry.address)}
                          </LinkExternal>
                        )}
                        <CopyButton text={entry.address} tooltipMessage="Copied" width="14px" />
                      </Flex>
                    </AddressRow>
                  ))}
                </CardBody>
              </Card>
            ))}
          </Flex>
        </Section>

        {/* FAQ */}
        <Section>
          <Heading as="h2" scale="lg" mb="16px">
            Frequently asked questions
          </Heading>
          <Card>
            <CardBody>
              {FAQS.map((faq) => (
                <Box key={faq.q} mb="20px">
                  <Heading as="h3" scale="md" mb="6px">
                    {faq.q}
                  </Heading>
                  <Text color="textSubtle" fontSize="14px">
                    {faq.a}
                  </Text>
                </Box>
              ))}
            </CardBody>
          </Card>
        </Section>

        {/* CONTACT / WORK WITH US */}
        <Section>
          <Heading as="h2" scale="lg" mb="16px">
            Contact / work with us
          </Heading>
          <Card>
            <CardBody>
              <Text mb="12px">
                Want to launch your own token, DEX, or app? Get in touch. CryptoHawking designs and ships custom
                decentralised exchanges, token launches, smart contracts, and web &amp; mobile applications.
              </Text>
              <ContactLinks />
            </CardBody>
          </Card>
        </Section>

        <Text fontSize="12px" color="textSubtle">
          CryptoHawking DEX is deployed on Base Sepolia testnet only. All tokens are valueless test assets. Never send
          real funds to any address on this page.
        </Text>
      </Box>
    </>
  )
}

export default Developers
