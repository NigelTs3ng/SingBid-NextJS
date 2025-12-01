// src/lib/transferQueue.ts
import { StripeService } from "./stripe";

export interface TransferJob {
  auctionId: string;
  sellerId: string;
  sellerStripeAccountId: string;
  amount: number;
  retries: number;
  maxRetries: number;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return typeof err === "string" ? err : JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function logStripeHints(err: unknown) {
  if (typeof err === "object" && err) {
    const anyErr = err as Record<string, unknown>;
    if (typeof anyErr["type"] === "string") {
      console.error("• Stripe error type:", anyErr["type"]);
    }
    if (typeof anyErr["code"] === "string") {
      console.error("• Stripe error code:", anyErr["code"]);
    }
    if (typeof anyErr["param"] === "string") {
      console.error("• Error parameter:", anyErr["param"]);
    }
    if (typeof anyErr["requestId"] === "string") {
      console.error("• Request ID:", anyErr["requestId"]);
    }
  }
}

class TransferQueue {
  private queue: TransferJob[] = [];
  private processing = false;
  private retryDelay = 5_000; // 5 seconds

  async add(job: Omit<TransferJob, "retries" | "maxRetries"> & { maxRetries?: number }) {
    const fullJob: TransferJob = {
      ...job,
      retries: 0,
      maxRetries: job.maxRetries ?? 3,
    };
    this.queue.push(fullJob);
    console.log(`📋 Added transfer job to queue: ${job.auctionId}`);

    // Kick off processing if idle
    if (!this.processing) void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    console.log(`🔄 Starting transfer queue processing (${this.queue.length} jobs)`);

    while (this.queue.length > 0) {
      const job = this.queue[0];

      try {
        console.log(`💳 Processing transfer: $${job.amount} → ${job.sellerStripeAccountId}`);
        const transfer = await StripeService.createTransfer(
          job.amount,
          job.sellerStripeAccountId,
          `auction_${job.auctionId}`
        );
        console.log(`✅ Transfer successful: ${transfer.id}`);
        this.queue.shift(); // remove successful job
      } catch (error: unknown) {
        job.retries++;

        console.error(
          `❌ Transfer failed (attempt ${job.retries}/${job.maxRetries}): ${errorMessage(error)}`
        );
        logStripeHints(error);

        if (job.retries >= job.maxRetries) {
          console.error(
            `🚨 Max retries reached for auction ${job.auctionId}. Manual intervention needed.`
          );
          this.queue.shift(); // drop after max retries
        } else {
          // backoff before retrying the same job
          await sleep(this.retryDelay);
        }
      }
    }

    this.processing = false;
    console.log("✨ Transfer queue processing complete");
  }

  getQueueSize() {
    return this.queue.length;
  }

  isProcessing() {
    return this.processing;
  }

  setRetryDelay(ms: number) {
    this.retryDelay = Math.max(0, ms);
  }

  clear() {
    this.queue = [];
  }
}

export const transferQueue = new TransferQueue();
export default TransferQueue;
