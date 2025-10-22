import { useState } from 'react'
import { useSettings } from '../store/useSettings'
import ContractAddress from '../components/ContractAddress'
import { getProduceDetails, buyProduce } from '../web3/contract'
import { QRCodeCanvas } from 'qrcode.react'

export default function Customer() {
  const { contractAddress, setContractAddress } = useSettings()
  const [id, setId] = useState('')
  const [details, setDetails] = useState<any>()
  const [busy, setBusy] = useState(false)

  async function loadDetails() {
    if (!contractAddress || !id) return
    setBusy(true)
    try {
      const d = await getProduceDetails(contractAddress, BigInt(id))
      setDetails(d)
    } finally {
      setBusy(false)
    }
  }

  async function handleBuy() {
    if (!contractAddress || !details) return
    setBusy(true)
    try {
      await buyProduce(contractAddress, BigInt(details.id), BigInt(details.priceInWei))
      await loadDetails()
      alert('Purchase success')
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
          <ContractAddress onSet={(a) => setContractAddress(a as `0x${string}`)} />
        </div>
      </section>

      <section className="card bg-base-200/40 border border-white/10">
        <div className="card-body space-y-4">
          <h2 className="card-title">Lookup Produce</h2>
          <div className="join">
            <input className="input input-bordered join-item" placeholder="Produce id" value={id} onChange={(e) => setId(e.target.value)} />
            <button className="btn btn-primary join-item" disabled={busy} onClick={loadDetails}>Load</button>
          </div>

          {details && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{details.name}</h3>
                <div className="text-base-content/70">Origin: {details.originFarm}</div>
                <div className="text-base-content/70">Status: {details.currentStatus}</div>
                <div className="text-base-content/70">Price: {String(details.priceInWei)} wei</div>
                <button className="btn btn-secondary" onClick={handleBuy} disabled={busy}>Buy</button>
              </div>
              <div className="flex items-center justify-center">
                <QRCodeCanvas value={details.qrCode || String(details.id)} size={180} bgColor="#0a0d1a" fgColor="#22d3ee"/>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
