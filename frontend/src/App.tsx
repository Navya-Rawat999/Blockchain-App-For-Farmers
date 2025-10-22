import { Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function Navbar() {
  return (
    <div className="navbar bg-base-100/60 backdrop-blur supports-[backdrop-filter]:bg-base-100/60 border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex-1">
          <a className="btn btn-ghost normal-case text-xl" href="/">ProduceChain</a>
        </div>
        <div className="flex-none">
          <ConnectWallet />
        </div>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="footer footer-center p-6 text-base-content/70">
      <aside>
        <p>© {new Date().getFullYear()} ProduceChain. Built for transparent agriculture.</p>
      </aside>
    </footer>
  )
}

function ConnectWallet() {
  return (
    <a className="btn btn-primary" href="/wallet">Connect Wallet</a>
  )
}
