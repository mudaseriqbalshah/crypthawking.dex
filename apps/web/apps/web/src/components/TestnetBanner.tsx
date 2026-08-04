import { styled } from 'styled-components'

const Bar = styled.div`
  background: linear-gradient(to right, #ec4899, #a855f7, #6366f1);
  color: #fff;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  position: sticky;
  top: 0;
  z-index: 100;
`

export const TestnetBanner = () => <Bar>Testnet — tokens have no value. Base Sepolia only.</Bar>
