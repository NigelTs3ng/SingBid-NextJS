import React, { useEffect, useState } from 'react'
import Header from '../components/ui/Header'
import Button from '../components/ui/Button'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'
import RaffleImageUpload from '../components/ui/RaffleImageUpload'
import RaffleImageService, { RaffleImage } from '../lib/raffleImageService'

export default function CreateRafflePage() {
  const router = useRouter()
  const { user, userProfile, loading } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ticketPrice, setTicketPrice] = useState<number>(500) // cents
  const [maxEntries, setMaxEntries] = useState<number>(100)
  const [endTimeLocal, setEndTimeLocal] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<RaffleImage[]>([])

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/auth/login')
      if (userProfile && userProfile.user_role !== 'seller') router.push('/dashboard/bidder')
    }
  }, [user, userProfile, loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title || !ticketPrice || !maxEntries || !endTimeLocal) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      const end_time = new Date(endTimeLocal).toISOString()
      const res = await fetch('/api/raffles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          ticket_price: Number(ticketPrice),
          max_entries: Number(maxEntries),
          end_time
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create raffle')

      // save images metadata if any
      const raffleId = data.raffle.id as string
      if (images.length > 0) {
        const payloads = images.map((img, idx) => ({
          image_url: img.image_url,
          image_path: img.image_path,
          display_order: idx,
          is_primary: idx === 0,
          alt_text: img.alt_text || null,
          file_size: img.file_size || null,
          mime_type: img.mime_type || null,
          width: img.width || null,
          height: img.height || null,
        }))
        try {
          await fetch(`/api/raffles/${raffleId}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: payloads })
          })
        } catch (e) {
          console.warn('Saving images failed; continuing', e)
        }
      }

      router.push(`/raffles/${raffleId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  // Default end_time to 48 hours from now
  useEffect(() => {
    if (!endTimeLocal) {
      const d = new Date(Date.now() + 48 * 3600 * 1000)
      const pad = (n: number) => String(n).padStart(2, '0')
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      setEndTimeLocal(local)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Create Raffle</h1>
        <p className="text-sm text-muted-foreground mb-6">Add details and images for your raffle prize.</p>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-foreground mb-3">Images</h3>
            <RaffleImageUpload onImagesChange={setImages} initialImages={images} />
          </section>

          <section className="bg-card border border-border rounded-lg p-4 space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-border rounded-md bg-background px-3 py-2"
                placeholder="e.g., Limited Edition Sneakers Raffle"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-border rounded-md bg-background px-3 py-2 h-28"
                placeholder="Describe the item, rules, and delivery details"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Ticket Price (USD)</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={(ticketPrice / 100).toString()}
                  onChange={(e) => setTicketPrice(Math.round((Number(e.target.value) || 0) * 100))}
                  className="w-full border border-border rounded-md bg-background px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Max Entries</label>
                <input
                  type="number"
                  min={1}
                  value={maxEntries}
                  onChange={(e) => setMaxEntries(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full border border-border rounded-md bg-background px-3 py-2"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">End Time</label>
              <input
                type="datetime-local"
                value={endTimeLocal}
                onChange={(e) => setEndTimeLocal(e.target.value)}
                className="w-full border border-border rounded-md bg-background px-3 py-2"
                required
              />
            </div>
          </section>

          <div className="pt-2">
            <Button type="submit" loading={submitting} iconName="Plus" fullWidth>
              {submitting ? 'Creating...' : 'Create Raffle'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}