import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

export default function Wallet() {
  const { address, isConnected } = useAccount()
  const { connect, error } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <div className="max-w-lg mx-auto card bg-base-200/40 border border-white/10">
      <div className="card-body">
        <h2 className="card-title">Wallet</h2>
        {isConnected ? (
          <div className="space-y-4">
            <div className="alert alert-success">
              <span>Connected: {address}</span>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline" onClick={() => disconnect()}>Disconnect</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-base-content/70">Connect using MetaMask or a browser wallet.</p>
            <button className="btn btn-primary" onClick={() => connect({ connector: injected() })}>
              Connect MetaMask
            </button>
            {error && <p className="text-error text-sm">{error.message}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
