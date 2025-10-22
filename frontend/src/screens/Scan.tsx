import { useEffect, useState } from 'react'
import { useSettings } from '../store/useSettings'
import { getProduceDetails } from '../web3/contract'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import ContractAddress from '../components/ContractAddress'

export default function Scan() {
  const { contractAddress } = useSettings()
  const [decoded, setDecoded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<any>()

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader()
    const video = document.getElementById('video') as HTMLVideoElement | null
    if (!video) return

    let active = true
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        video.srcObject = stream
        await video.play()
        // Continuously try to decode frames
        const tick = async () => {
          if (!active) return
          try {
            const result = await codeReader.decodeFromVideoElement(video)
            if (result) {
              setDecoded(result.getText())
              active = false
              return
            }
          } catch (e) {
            if (!(e instanceof NotFoundException)) {
              setError('Scanner error')
            }
          }
          requestAnimationFrame(tick)
        }
        tick()
      } catch (e: any) {
        setError(e.message ?? 'Camera error')
      }
    })()

    return () => {
      active = false
      if (video?.srcObject) {
        const tracks = (video.srcObject as MediaStream).getTracks()
        tracks.forEach((t) => t.stop())
      }
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      if (decoded && contractAddress) {
        try {
          const id = BigInt(decoded)
          const d = await getProduceDetails(contractAddress, id)
          setDetails(d)
        } catch {
          // Assume decoded is not id but raw QR payload that encodes id somewhere
        }
      }
    })()
  }, [decoded, contractAddress])

  return (
    <div className="max-w-3xl mx-auto grid gap-6">
      <section className="card bg-base-200/40 border border-white/10">
        <div className="card-body">
          <h2 className="card-title">Contract</h2>
          <ContractAddress onSet={(a) => useSettings.getState().setContractAddress(a as `0x${string}`)} />
        </div>
      </section>

      <section className="card bg-base-200/40 border border-white/10">
        <div className="card-body">
          <h2 className="card-title">Scan QR</h2>
          <video id="video" className="rounded-lg w-full aspect-video bg-black/40"/>
          {error && <p className="text-error text-sm mt-2">{error}</p>}
          {decoded && <div className="alert alert-info mt-2"><span>Decoded: {decoded}</span></div>}
        </div>
      </section>

      {details && (
        <section className="card bg-base-200/40 border border-white/10">
          <div className="card-body">
            <h3 className="card-title">Produce Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div><span className="opacity-70">Name:</span> {details.name}</div>
                <div><span className="opacity-70">Origin:</span> {details.originFarm}</div>
                <div><span className="opacity-70">Status:</span> {details.currentStatus}</div>
                <div><span className="opacity-70">Price:</span> {String(details.priceInWei)} wei</div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
