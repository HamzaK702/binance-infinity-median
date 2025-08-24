import Heap from "heap";

class MedianTracker {
  constructor() {
    this.maxHeap = new Heap((a, b) => b - a);
    this.minHeap = new Heap((a, b) => a - b);
    this.count = 0;
  }

  addPrice = (price) => {
    this.count++;

    if (this.maxHeap.empty()) {
      this.maxHeap.push(price);
      return;
    }

    if (price <= this.maxHeap.peek()) {
      this.maxHeap.push(price);
    } else {
      this.minHeap.push(price);
    }
    this.rebalance();
  };

  rebalance = () => {
    if (this.maxHeap.size() > this.minHeap.size() + 1) {
      this.minHeap.push(this.maxHeap.pop());
    } else if (this.minHeap.size() > this.maxHeap.size()) {
      this.maxHeap.push(this.minHeap.pop());
    }
  };

  getMedian = () => {
    if (this.count === 0) return null;

    if (this.count % 2 === 1) {
      return this.maxHeap.peek();
    } else {
      return (this.maxHeap.peek() + this.minHeap.peek()) / 2;
    }
  };

  getStats = () => ({
    count: this.count,
    median: this.getMedian(),
    maxHeapSize: this.maxHeap.size(),
    minHeapSize: this.minHeap.size(),
  });
}

export default MedianTracker;
