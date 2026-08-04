import type { GetServerSideProps } from 'next'

// The PancakeSwap-branded marketing home page is out of scope for CryptoHawking;
// redirect straight to the swap interface.
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/swap',
      permanent: false,
    },
  }
}

const IndexPage = () => null

export default IndexPage
