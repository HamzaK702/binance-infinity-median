import Heap from "heap";

class MedianTracker {
  constructor() {
    this.maxHeap = new Heap((a, b) => b - a); // Bada heap, Max Heap.
    this.minHeap = new Heap((a, b) => a - b); // Chota heap, Min Heap.
    this.count = 0;
    // console.log('MedianTracker instance initialized.');
    // console.log('Heaps created. maxHeap: ' + this.maxHeap.size() + ', minHeap: ' + this.minHeap.size());
  }

  addPrice = (price) => {
    this.count++;
    // console.log("New price: " + price);
    // console.log(this.maxHeap.size(), this.minHeap.size());

    if (this.maxHeap.empty()) {
      this.maxHeap.push(price);
      // console.log("Added to maxHeap. Count: " + this.count);
      return;
    }

    if (price <= this.maxHeap.peek()) {
      this.maxHeap.push(price);
    } else {
      this.minHeap.push(price);
    }
    this.rebalance();
    // console.log("Rebalanced. New sizes: maxHeap=" + this.maxHeap.size() + ", minHeap=" + this.minHeap.size());
  };

  rebalance = () => {
    // console.log("Rebalancing logic starting...");
    // console.log("sizes: max=" + this.maxHeap.size() + " min=" + this.minHeap.size())
    // console.log("888888")
    if (this.maxHeap.size() > this.minHeap.size() + 1) {
      // console.log("Max heap is too big, moving element.");
      this.minHeap.push(this.maxHeap.pop());
    } else if (this.minHeap.size() > this.maxHeap.size()) {
      // console.log("Min heap is too big, moving element.");
      this.maxHeap.push(this.minHeap.pop());
    }
    // console.log("Rebalance complete.");
  };

  getMedian = () => {
    if (this.count === 0) return null;
    // console.log("Calculating median, count is " + this.count);
    // console.log(this.count % 2 === 1 ? "Odd count" : "Even count")

    if (this.count % 2 === 1) {
      // console.log("Median is from maxHeap: " + this.maxHeap.peek());
      return this.maxHeap.peek();
    } else {
      // console.log('Median is average of ' + this.maxHeap.peek() + ' and ' + this.minHeap.peek());
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

