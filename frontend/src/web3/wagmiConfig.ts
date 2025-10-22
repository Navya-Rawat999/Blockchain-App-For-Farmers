import { http, createConfig } from 'wagmi'
import { base, mainnet, polygonAmoy, sepolia } from 'wagmi/chains'

// Default to any EVM; user will connect Metamask to supported chain.
export const config = createConfig({
  chains: [sepolia, mainnet, polygonAmoy, base],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
    [polygonAmoy.id]: http(),
    [base.id]: http(),
  },
})
