import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useSettings } from '../store/useSettings'
import ContractAddress from '../components/ContractAddress'
import { registerProduce, updatePrice, updateStatus } from '../web3/contract'

export default function Farmer() {
  useAccount() // used to ensure wallet context; value not directly needed here
  const { contractAddress, setContractAddress } = useSettings()

  const [name, setName] = useState('')
  const [origin, setOrigin] = useState('')
  const [price, setPrice] = useState('')
  const [qr, setQr] = useState('')

  const [statusId, setStatusId] = useState('')
  const [statusText, setStatusText] = useState('')

  const [priceId, setPriceId] = useState('')
  const [newPrice, setNewPrice] = useState('')

  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | undefined>()

  async function handleRegister() {
    if (!contractAddress) return alert('Set contract address first')
    if (!name || !origin || !price || !qr) return alert('Fill all fields')
    setBusy(true)
    try {
      const receipt = await registerProduce(contractAddress, name, origin, BigInt(price), qr)
      setResult(`Registered. Tx: ${receipt.transactionHash}`)
    } catch (e: any) {
      alert(e.message ?? 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdateStatus() {
    if (!contractAddress) return alert('Set contract address first')
    if (!statusId || !statusText) return alert('Fill all fields')
    setBusy(true)
    try {
      const receipt = await updateStatus(contractAddress, BigInt(statusId), statusText)
      setResult(`Status updated. Tx: ${receipt.transactionHash}`)
    } catch (e: any) {
      alert(e.message ?? 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdatePrice() {
    if (!contractAddress) return alert('Set contract address first')
    if (!priceId || !newPrice) return alert('Fill all fields')
    setBusy(true)
    try {
      const receipt = await updatePrice(contractAddress, BigInt(priceId), BigInt(newPrice))
      setResult(`Price updated. Tx: ${receipt.transactionHash}`)
    } catch (e: any) {
      alert(e.message ?? 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-8 max-w-4xl mx-auto">
      <section className="card bg-base-200/40 border border-white/10">
        <div className="card-body">
          <h2 className="card-title">Contract</h2>
          {!contractAddress && <p className="text-base-content/70">Paste your deployed ProduceMarket contract address.</p>}
          <ContractAddress onSet={(a) => setContractAddress(a as `0x${string}`)} />
        </div>
      </section>

      <section className="card bg-base-200/40 border border-white/10">
        <div className="card-body">
          <h2 className="card-title">Register Produce</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input className="input input-bordered" placeholder="Produce name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input input-bordered" placeholder="Origin farm" value={origin} onChange={(e) => setOrigin(e.target.value)} />
            <input className="input input-bordered" placeholder="Price (in Wei/INR units)" value={price} onChange={(e) => setPrice(e.target.value)} />
            <input className="input input-bordered" placeholder="QR payload (e.g. produce id or data)" value={qr} onChange={(e) => setQr(e.target.value)} />
          </div>
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-primary" disabled={busy} onClick={handleRegister}>Register</button>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-8">
        <div className="card bg-base-200/40 border border-white/10">
          <div className="card-body">
            <h3 className="card-title">Update Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <input className="input input-bordered" placeholder="Produce id" value={statusId} onChange={(e) => setStatusId(e.target.value)} />
              <input className="input input-bordered" placeholder="New status" value={statusText} onChange={(e) => setStatusText(e.target.value)} />
            </div>
            <div className="card-actions justify-end mt-4">
              <button className="btn" disabled={busy} onClick={handleUpdateStatus}>Update</button>
            </div>
          </div>
        </div>
        <div className="card bg-base-200/40 border border-white/10">
          <div className="card-body">
            <h3 className="card-title">Update Price</h3>
            <div className="grid grid-cols-2 gap-4">
              <input className="input input-bordered" placeholder="Produce id" value={priceId} onChange={(e) => setPriceId(e.target.value)} />
              <input className="input input-bordered" placeholder="New price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
            </div>
            <div className="card-actions justify-end mt-4">
              <button className="btn" disabled={busy} onClick={handleUpdatePrice}>Update</button>
            </div>
          </div>
        </div>
      </section>

      {result && (
        <div className="alert alert-info"><span>{result}</span></div>
      )}
    </div>
  )
}
