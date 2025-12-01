"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import Link from 'next/link';

const AuctionListings = () => {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('active')
  const [sort, setSort] = useState('ending')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 9

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/auctions?status=all')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load auctions')
        setAuctions(data.auctions || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const timeLeft = (end) => {
    const diff = new Date(end).getTime() - Date.now()
    if (diff <= 0) return 'Ended'
    const d = Math.floor(diff / (24*3600*1000))
    const h = Math.floor((diff % (24*3600*1000)) / (3600*1000))
    const m = Math.floor((diff % (3600*1000)) / (60*1000))
    if (d > 0) return `${d}d ${h}h`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  const visible = useMemo(() => {
    let list = [...auctions]
    if (filter === 'active') list = list.filter(a => a.status === 'active')
    if (q) list = list.filter(a => a.title.toLowerCase().includes(q.toLowerCase()))
    if (sort === 'ending') list.sort((a,b)=> new Date(a.end_time).getTime() - new Date(b.end_time).getTime())
    if (sort === 'price_low') list.sort((a,b)=> a.current_price - b.current_price)
    if (sort === 'price_high') list.sort((a,b)=> b.current_price - a.current_price)
    return list
  }, [auctions, filter, sort, q])

  const totalPages = Math.max(1, Math.ceil(visible.length / perPage))
  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage
    return visible.slice(start, start + perPage)
  }, [visible, page])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Auctions</h1>
              <p className="text-sm text-muted-foreground">Place your bids on unique items. Browse auctions to find what you're looking for.</p>
            </div>
            <span className="text-sm text-muted-foreground">{visible.length} results</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              <button onClick={()=>setFilter('active')} className={`px-3 py-1.5 text-sm ${filter==='active'?'bg-accent text-foreground':'text-muted-foreground hover:bg-accent'}`}>Active</button>
              <button onClick={()=>setFilter('all')} className={`px-3 py-1.5 text-sm ${filter==='all'?'bg-accent text-foreground':'text-muted-foreground hover:bg-accent'}`}>All</button>
            </div>
            <div className="relative">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search auctions" className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-md bg-background" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort</span>
              <select value={sort} onChange={e=>setSort(e.target.value)} className="text-sm border border-border rounded-md bg-background px-2 py-1">
                <option value="ending">Ending soon</option>
                <option value="price_low">Price: low to high</option>
                <option value="price_high">Price: high to low</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: perPage }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="aspect-[16/10] bg-muted animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
            <Icon name="AlertTriangle" size={18} className="text-destructive" />
            <span className="text-destructive">{error}</span>
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="text-center py-20 bg-card border border-border rounded-xl">
            <p className="text-muted-foreground mb-3">No auctions match your filters.</p>
            <div className="inline-flex rounded-md border border-border overflow-hidden">
              <button onClick={()=>{setFilter('all'); setQ('')}} className="px-3 py-1.5 text-sm hover:bg-accent">Clear filters</button>
            </div>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((a) => (
            <Link key={a.id} href={`/auction-details/${a.id}`} className="group">
              <div className="relative bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 hover:translate-y-[-2px] hover:bidwin-shadow">
                <div className="aspect-[16/10] bg-muted overflow-hidden">
                  {a.primary_image ? (
                    <img src={a.primary_image} alt={a.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="w-full h-full bidwin-gradient" />
                  )}
                  <div className="absolute top-3 left-3 inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-black/60 text-white backdrop-blur">
                    {timeLeft(a.end_time)}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2">{a.title}</h3>
                  {a.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{a.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center space-x-2">
                      <Icon name="Gavel" size={16} />
                      <span>${(a.current_price || 0).toFixed(2)}</span>
                    </span>
                    <span className="inline-flex items-center space-x-2">
                      <Icon name="Clock" size={16} />
                      <span>{timeLeft(a.end_time)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        {!loading && visible.length > perPage && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button variant="outline" size="sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>Prev</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next</Button>
          </div>
        )}
      </main>
    </div>
  )
};

export default AuctionListings;
