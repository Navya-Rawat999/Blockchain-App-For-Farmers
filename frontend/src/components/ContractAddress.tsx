import { useState } from 'react'

export default function ContractAddress({ onSet }: { onSet: (addr: string) => void }) {
  const [addr, setAddr] = useState('')
  return (
    <div className="join w-full">
      <input type="text" placeholder="Contract address (0x...)" value={addr} onChange={(e) => setAddr(e.target.value)} className="input input-bordered join-item w-full" />
      <button className="btn btn-primary join-item" onClick={() => onSet(addr)}>Set</button>
    </div>
  )
}
