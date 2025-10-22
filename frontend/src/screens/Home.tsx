import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-10">
      <Hero />
      <div className="grid md:grid-cols-3 gap-6 w-full">
        <Card title="For Farmers" body="Register produce, set price, generate QR and sell directly." cta={<Link to="/farmer" className="btn btn-primary w-full">Farmer Portal</Link>} />
        <Card title="For Customers" body="Browse market, scan QR, verify origin and price history." cta={<Link to="/customer" className="btn btn-secondary w-full">Customer Portal</Link>} />
        <Card title="Scan QR" body="Scan a product QR to view on-chain traceability instantly." cta={<Link to="/scan" className="btn btn-accent w-full">Open Scanner</Link>} />
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="w-full text-center space-y-6">
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
        Transparent Farm-to-Table on Blockchain
      </h1>
      <p className="text-base-content/70 max-w-2xl mx-auto">
        Register agricultural produce, verify origin and pricing, and pay farmers directly.
        Powered by smart contracts and QR codes.
      </p>
      <div className="flex justify-center gap-3">
        <Link to="/wallet" className="btn btn-primary">Connect Wallet</Link>
        <Link to="/customer" className="btn btn-ghost">Explore Market</Link>
      </div>
    </section>
  )
}

function Card({ title, body, cta }: { title: string, body: string, cta: React.ReactNode }) {
  return (
    <div className="card bg-base-200/40 border border-white/10 backdrop-blur">
      <div className="card-body">
        <h2 className="card-title">{title}</h2>
        <p className="text-base-content/70">{body}</p>
        <div className="card-actions justify-end mt-4">{cta}</div>
      </div>
    </div>
  )
}
