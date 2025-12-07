# Flare-Powered Freelancer Escrow Vault

## 🌟 Our Vision
Our vision is to create a secure, transparent **Escrow Vault for Freelancers**, powered by the **Flare Network**. We aim to bridge the trust gap in the gig economy by leveraging decentralized technology to align the interests of both freelancers and clients.

## 😟 The Problem
The current freelancing landscape is plagued by a lack of trust:

*   **For Freelancers:** There is a constant fear that their services and intellectual property (IP) could be misused or that they won't be paid after delivering work.
*   **For Clients:** There is a risk that a freelancer might take an advance payment and "ghost" the client without delivering the agreed-upon work.

## 🛡️ The Solution
To overcome these issues of confidence and trust, our product utilizes **Smart Contracts** and an **Escrow Wallet** system to ensure a fair exchange of value.

We leverage key **Flare Network Technologies** to secure the process:
*   **Flare Test Network (Coston2):** For deployment and testing in a scalable environment.
*   **Flare Time Series Oracle (FTSO):** To provide accurate, decentralized price feeds for payment currencies.
*   **FAssets Integration:** To allow non-smart contract assets (like BTC, XRP, DOGE) to be used trustlessly within our DeFi ecosystem.

By locking funds in a smart contract escrow, we ensure that funds are only released when milestones are met, securing the interests of both parties.

## 🔄 How It Works
The following flowchart illustrates the secure workflow enabled by the Flare Network:

```mermaid
graph TD
    subgraph "Flare Network Ecosystem"
        FTSO[Flare Time Series Oracle]
        FAssets[FAssets Integration]
    end

    subgraph "Escrow Vault Platform"
        Client[Client]
        Freelancer[Freelancer]
        Escrow[Smart Contract Escrow]
    end

    Client -- "1. Creates Job & Deposits Funds" --> Escrow
    FTSO -- "2. Provides Real-time Rates" --> Escrow
    FAssets -- "3. Bridges Non-SC Assets (BTC/XRP)" --> Escrow
    Freelancer -- "4. Accepts Job & Submits Work" --> Escrow
    Client -- "5. Approves Work" --> Escrow
    Escrow -- "6. Releases Funds" --> Freelancer

    style FTSO fill:#FF4500,stroke:#333,stroke-width:2px,color:white
    style FAssets fill:#FF4500,stroke:#333,stroke-width:2px,color:white
    style Escrow fill:#4682B4,stroke:#333,stroke-width:2px,color:white
```

## 🎥 Demo Video
Watch our product in action:  
[**View Demo Video**](https://drive.google.com/file/d/1ge5kbRBOoKTKQN0vKyxAlgQArQ5n5fH-/view?usp=drivesdk)

---

## 📸 Platform Features

### 1. Landing Page
Connect your wallet and choose your role - Client or Freelancer.

![Landing Page](./assets/landing-page.png)

### 2. Client Dashboard
Create jobs, manage applications, and oversee your contracts securely with blockchain.

![Client Dashboard](./assets/client-dashboard.png)

### 3. Freelancer Dashboard
Find exciting projects, submit proposals, and build your decentralized career.

![Freelancer Dashboard](./assets/freelancer-dashboard.png)

---

## 🚀 Complete Workflow

### **For Clients:**

#### Create a New Job
Post a new job listing to the decentralized marketplace with FAsset payment options.

![Create Job](./assets/create-job.png)

#### Transaction Request
Every action on the platform requires blockchain confirmation on the **Flare Testnet (Coston2)**.

![Transaction Request](./assets/transaction-request.png)

#### Review Applications
Review and approve proposals from freelancers.

![Approve Proposal](./assets/approve-proposal.png)

#### Finalize Payment
Approve tokens and fund the escrow to activate the contract.

![Finalize Payment](./assets/finalize-payment.png)

#### Job Confirmation
All transactions are confirmed on-chain, ensuring transparency.

![Job Confirmation](./assets/job-confirmation.png)

#### View Active Jobs
Track all your active jobs and their progress.

![Current Jobs](./assets/current-jobs-list.png)

#### Job Details & Milestones
Monitor project milestones and approve deliverables.

![Job Details](./assets/job-details-client.png)

#### Review Checkpoint Submissions
Preview, approve, or reject work submitted by freelancers.

![Checkpoint Review](./assets/checkpoint-review-client.png)

#### Preview Work with Watermark
View submitted work with a watermark before final approval.

![Checkpoint Preview](./assets/checkpoint-preview.png)

#### Approve Checkpoint
Once satisfied, approve the checkpoint to release payment.

![Checkpoint Approved](./assets/checkpoint-approved-client.png)

---

### **For Freelancers:**

#### Find New Jobs
Browse the marketplace and submit winning proposals.

![Find Jobs](./assets/find-jobs.png)

#### Submit Proposal
Propose your price, cancellation terms, and estimated delivery time.

![Submit Proposal](./assets/submit-proposal.png)

#### View Current Jobs
Track all your active jobs and deadlines.

![Current Jobs Freelancer](./assets/current-jobs-freelancer.png)

#### Job Details & Checkpoints
View contract details and submit work for each milestone.

![Job Details Freelancer](./assets/job-details-freelancer.png)

#### Upload to IPFS
Submit your work by uploading files to IPFS for decentralized storage.

![IPFS Upload](./assets/ipfs-upload.png)

#### Pending Approval
Wait for the client to review and approve your submission.

![Checkpoint Pending](./assets/checkpoint-pending-approval.png)

#### Checkpoint Approved
Once approved, funds are released from escrow to your wallet.

![Checkpoint Approved Freelancer](./assets/checkpoint-approved-freelancer.png)

---

## 🔧 Tech Stack

### **Frontend**
- React + Vite
- TailwindCSS
- ethers.js (Web3 integration)

### **Backend**
- Node.js + Express
- IPFS (Decentralized file storage)

### **Blockchain**
- Solidity Smart Contracts
- Flare Network (Coston2 Testnet)
- Hardhat (Development & Deployment)

### **Flare Technologies**
- **FTSO (Flare Time Series Oracle):** Real-time price feeds
- **FAssets:** Bridge non-smart contract assets (BTC, XRP, DOGE)
- **Escrow Wallet:** Secure milestone-based payments

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v16+)
- MetaMask wallet
- Flare Testnet (Coston2) configured

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mgokulselvandev/Flarelance.git
cd Flarelance
```

2. **Install dependencies**
```bash
# Install contract dependencies
cd contracts
npm install

# Install backend dependencies
cd ../backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. **Configure environment variables**
```bash
# Copy .env.example to .env in both backend and frontend
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

4. **Deploy smart contracts**
```bash
cd contracts
npm run deploy
```

5. **Update .env files with deployed contract addresses**

6. **Start the application**
```bash
# Start backend (in backend folder)
npm start

# Start frontend (in frontend folder)
npm run dev
```

---

## 📄 License
MIT License

---

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request.

---

**Built with ❤️ on Flare Network**
