# Hardware Specification: The 'Scogen Core' Server

## Objective

To run the entire Scogen stack (API, DB, AI Inference) locally with **zero external dependencies**.

---

## Compute Requirements

### Role
Host FastAPI, PostgreSQL, MinIO, and run concurrent AI inference (LLM + Audio).

### CPU
**AMD Ryzen 9 7950X (16 Cores)** or Threadripper

- High clock speed preferred for Python execution
- Multi-core for concurrent request handling
- AVX2/AVX-512 support for ML operations

### RAM
**128GB DDR5 (minimum)**

Required to:
- Load LLM weights (70B model ~40GB)
- Vector indices (pgvector)
- Database cache
- Multiple concurrent sessions

### Storage
**2x 2TB NVMe SSD (Gen 5) in RAID 1 (Mirroring)**

- RAID 1 for data safety
- Gen 5 for maximum throughput (14GB/s)
- Separate OS drive recommended

---

## AI Acceleration: The Engine

### Goal
Run **Llama-3-70B (Quantized)** or **Mixtral 8x7B** with **< 500ms latency**.

### GPU Configuration

#### Primary Option
**2x NVIDIA RTX 4090 (24GB VRAM each)**

- Total: 48GB VRAM
- Allows 8k+ context windows
- Concurrent LLM + Whisper inference

#### Why Consumer Cards?
- Better price/performance than H100s for inference-only workloads
- Easier to source and replace
- Lower power consumption per TFLOP

#### Alternative (Budget)
**2x RTX 3090 (24GB VRAM each)** - Used market

- Same VRAM capacity
- Slightly slower inference (~600ms)
- Significant cost savings

### Model Loading Strategy

```
GPU 0: Llama-3-70B (Quantized to 4-bit) - Primary LLM
GPU 1: Whisper Large-v3 + Overflow LLM layers
```

---

## Network & Power

### UPS
**1500VA minimum** (to handle GPU spikes)

- Pure sine wave output
- Runtime: 10-15 minutes at full load
- Protects against data corruption during outages

### Connectivity
**Static IP with Reverse Proxy (Caddy) handling SSL termination**

- Gigabit Ethernet minimum
- 10GbE recommended for multi-user scenarios
- Caddy for automatic HTTPS

---

## Cooling & Acoustics

### Cooling
- High-airflow case (Fractal Design Meshify 2 XL or similar)
- 280mm AIO for CPU
- GPU spacing: Minimum 2-slot gap between cards

### Acoustics
- Noise-optimized fans (Noctua)
- GPU undervolting to reduce heat/noise
- Consideration: Server room or isolated space

---

## Total System Cost Estimate

| Component | Primary Option | Budget Option |
|-----------|---------------|---------------|
| CPU | Ryzen 9 7950X - $550 | Ryzen 9 7900X - $400 |
| Motherboard | X670E - $350 | X670 - $250 |
| RAM | 128GB DDR5 - $450 | 128GB DDR5 - $450 |
| GPU | 2x RTX 4090 - $3,600 | 2x RTX 3090 (used) - $1,800 |
| Storage | 2x 2TB Gen5 - $600 | 2x 2TB Gen4 - $400 |
| PSU | 1600W Platinum - $350 | 1200W Gold - $250 |
| Case/Cooling | $300 | $200 |
| UPS | $250 | $150 |
| **Total** | **~$6,450** | **~$3,900** |

---

## Performance Expectations

### LLM Inference
- **Llama-3-70B**: 30-50 tokens/sec (quantized)
- **Context Window**: 8k tokens
- **Concurrent Sessions**: 3-5 users

### Speech-to-Text
- **Whisper Large-v3**: Real-time transcription
- **Latency**: <200ms for 10-second clips

### Database
- **PostgreSQL**: 10k+ queries/sec
- **Vector Search**: <50ms for similarity queries

---

## Scaling Considerations

### Horizontal Scaling
Add additional GPU nodes for:
- More concurrent users
- Larger models (Llama-3-405B)
- Fine-tuned domain models

### Vertical Scaling
- Upgrade to Threadripper for more PCIe lanes
- Add more RAM for larger context windows
- NVMe RAID 0 for faster vector index loading

---

## Maintenance & Monitoring

### Monitoring
- GPU utilization (nvidia-smi)
- Temperature monitoring
- Power consumption tracking

### Maintenance Schedule
- Monthly: Dust filters, thermal paste check
- Quarterly: Firmware updates
- Annually: Thermal paste replacement

---

See also:
- [Master Context](./00-master-context.md)
- [Pricing Algorithm](./pricing-algorithm.md)
- [Database Schema](./database-schema.md)
