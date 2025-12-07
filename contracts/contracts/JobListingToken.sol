// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title JobListingToken
 * @dev ERC721 NFT contract where each job listing is a unique NFT
 * Integrates with Flare's FAssets for payments
 */
contract JobListingToken is ERC721, ERC721URIStorage {
    struct JobListingData {
        uint256 jobId;
        string title;
        string description;
        string jobType;
        uint256 deadline;
        uint256 minPrice;  // Price in USD (18 decimals)
        uint256 maxPrice;  // Price in USD (18 decimals)
        address clientAddress;
        uint256 createdAt;
        bool isActive;
        string paymentFAsset;  // FAsset symbol (e.g., "testUSDT", "fUSDT", "fXRP")
        string metadataURI;    // IPFS URI for NFT metadata
    }

    struct Application {
        address freelancerAddress;
        uint256 proposedPrice;
        uint256 cancellationTimeDays;
        string estimatedDelivery;
        string portfolioLink;
        uint256 appliedAt;
        bool isApproved;
    }

    // Storage
    mapping(uint256 => JobListingData) public jobs;
    mapping(uint256 => Application[]) public jobApplications;
    mapping(uint256 => address) public jobTokens; // jobId => JobToken contract address
    uint256 private _nextTokenId;
    address public owner;
    address public priceOracle;  // Flare FTSO price oracle
    address public fassetRegistry;  // FAsset registry

    // Events
    event JobListingCreated(
        uint256 indexed jobId,
        address indexed clientAddress,
        string title,
        uint256 deadline,
        string paymentFAsset
    );
    event ApplicationSubmitted(
        uint256 indexed jobId,
        address indexed freelancerAddress,
        uint256 proposedPrice,
        uint256 applicationIndex
    );
    event ApplicationApproved(
        uint256 indexed jobId,
        uint256 indexed applicationIndex,
        address indexed freelancerAddress
    );
    event JobNFTMinted(uint256 indexed tokenId, address indexed owner, string metadataURI);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() ERC721("Freelance Job NFT", "FJOB") {
        owner = msg.sender;
        _nextTokenId = 0;
    }
    
    /**
     * @dev Set price oracle address (Flare FTSO integration)
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid address");
        priceOracle = _priceOracle;
    }
    
    /**
     * @dev Set FAsset registry address
     */
    function setFAssetRegistry(address _fassetRegistry) external onlyOwner {
        require(_fassetRegistry != address(0), "Invalid address");
        fassetRegistry = _fassetRegistry;
    }
    
    /**
     * @dev Get total number of jobs (NFTs minted)
     */
    function jobCount() external view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev Create a new job listing and mint NFT
     * @return jobId The ID of the newly created job (also the NFT token ID)
     */
    function createJobListing(
        string memory _title,
        string memory _description,
        string memory _jobType,
        uint256 _deadline,
        uint256 _minPrice,
        uint256 _maxPrice,
        string memory _paymentFAsset,
        string memory _metadataURI
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_minPrice > 0, "Min price must be greater than 0");
        require(_maxPrice >= _minPrice, "Max price must be >= min price");
        require(bytes(_paymentFAsset).length > 0, "Payment FAsset required");

        uint256 newJobId = _nextTokenId;
        _nextTokenId++;
        
        // Mint NFT to job creator
        _safeMint(msg.sender, newJobId);
        
        // Set metadata URI if provided
        if (bytes(_metadataURI).length > 0) {
            _setTokenURI(newJobId, _metadataURI);
        }
        
        jobs[newJobId] = JobListingData({
            jobId: newJobId,
            title: _title,
            description: _description,
            jobType: _jobType,
            deadline: _deadline,
            minPrice: _minPrice,
            maxPrice: _maxPrice,
            clientAddress: msg.sender,
            createdAt: block.timestamp,
            isActive: true,
            paymentFAsset: _paymentFAsset,
            metadataURI: _metadataURI
        });
        
        emit JobListingCreated(newJobId, msg.sender, _title, _deadline, _paymentFAsset);
        emit JobNFTMinted(newJobId, msg.sender, _metadataURI);
        
        return newJobId;
    }

    /**
     * @dev Freelancer applies for a specific job
     */
    function applyForJob(
        uint256 _jobId,
        uint256 _proposedPrice,
        uint256 _cancellationTimeDays,
        string memory _estimatedDelivery,
        string memory _portfolioLink
    ) external {
        require(_jobId < _nextTokenId, "Job does not exist");
        require(jobs[_jobId].isActive, "Job is not active");
        require(bytes(jobs[_jobId].title).length > 0, "Job listing does not exist");
        require(
            _proposedPrice >= jobs[_jobId].minPrice && _proposedPrice <= jobs[_jobId].maxPrice,
            "Price must be within range"
        );
        require(_cancellationTimeDays > 0, "Cancellation time must be positive");
        require(bytes(_estimatedDelivery).length > 0, "Estimated delivery required");

        jobApplications[_jobId].push(Application({
            freelancerAddress: msg.sender,
            proposedPrice: _proposedPrice,
            cancellationTimeDays: _cancellationTimeDays,
            estimatedDelivery: _estimatedDelivery,
            portfolioLink: _portfolioLink,
            appliedAt: block.timestamp,
            isApproved: false
        }));

        uint256 applicationIndex = jobApplications[_jobId].length - 1;
        emit ApplicationSubmitted(_jobId, msg.sender, _proposedPrice, applicationIndex);
    }

    /**
     * @dev Client approves an application
     * Note: Only NFT owner (job creator) can approve
     */
    function approveApplication(uint256 _jobId, uint256 _applicationIndex) external {
        require(_jobId < _nextTokenId, "Job does not exist");
        require(ownerOf(_jobId) == msg.sender, "Only NFT owner can approve");
        require(_applicationIndex < jobApplications[_jobId].length, "Application does not exist");
        require(!jobApplications[_jobId][_applicationIndex].isApproved, "Application already approved");
        
        jobApplications[_jobId][_applicationIndex].isApproved = true;
        
        emit ApplicationApproved(_jobId, _applicationIndex, jobApplications[_jobId][_applicationIndex].freelancerAddress);
    }

    /**
     * @dev Set JobToken contract address for a job
     * Note: Only NFT owner can set job token
     */
    function setJobToken(uint256 _jobId, address _jobTokenAddress) external {
        require(_jobId < _nextTokenId, "Job does not exist");
        require(ownerOf(_jobId) == msg.sender, "Only NFT owner can set job token");
        require(jobTokens[_jobId] == address(0), "Job token already set");
        
        jobTokens[_jobId] = _jobTokenAddress;
    }

    /**
     * @dev Get JobToken contract address for a job
     */
    function getJobToken(uint256 _jobId) external view returns (address) {
        require(_jobId < _nextTokenId, "Job does not exist");
        return jobTokens[_jobId];
    }

    /**
     * @dev Get all job listings
     */
    function getAllJobs() external view returns (JobListingData[] memory) {
        JobListingData[] memory allJobs = new JobListingData[](_nextTokenId);
        for (uint256 i = 0; i < _nextTokenId; i++) {
            allJobs[i] = jobs[i];
        }
        return allJobs;
    }

    /**
     * @dev Get active job listings only
     */
    function getActiveJobs() external view returns (JobListingData[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < _nextTokenId; i++) {
            if (jobs[i].isActive && jobs[i].deadline > block.timestamp) {
                activeCount++;
            }
        }
        
        JobListingData[] memory activeJobs = new JobListingData[](activeCount);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < _nextTokenId; i++) {
            if (jobs[i].isActive && jobs[i].deadline > block.timestamp) {
                activeJobs[currentIndex] = jobs[i];
                currentIndex++;
            }
        }
        return activeJobs;
    }

    /**
     * @dev Get a specific job by ID
     */
    function getJob(uint256 _jobId) external view returns (JobListingData memory) {
        require(_jobId < _nextTokenId, "Job does not exist");
        return jobs[_jobId];
    }

    /**
     * @dev Get all applications for a specific job
     */
    function getJobApplications(uint256 _jobId) external view returns (Application[] memory) {
        require(_jobId < _nextTokenId, "Job does not exist");
        return jobApplications[_jobId];
    }

    /**
     * @dev Get application count for a specific job
     */
    function getApplicationCount(uint256 _jobId) external view returns (uint256) {
        require(_jobId < _nextTokenId, "Job does not exist");
        return jobApplications[_jobId].length;
    }

    /**
     * @dev Deactivate a job (only by NFT owner)
     */
    function deactivateJob(uint256 _jobId) external {
        require(_jobId < _nextTokenId, "Job does not exist");
        require(ownerOf(_jobId) == msg.sender, "Only NFT owner can deactivate");
        jobs[_jobId].isActive = false;
    }
    
    /**
     * @dev Get jobs owned by an address
     */
    function getJobsByOwner(address _owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(_owner);
        uint256[] memory ownedJobs = new uint256[](balance);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < _nextTokenId; i++) {
            try this.ownerOf(i) returns (address tokenOwner) {
                if (tokenOwner == _owner) {
                    ownedJobs[currentIndex] = i;
                    currentIndex++;
                }
            } catch {
                // Token doesn't exist, skip
                continue;
            }
        }
        
        return ownedJobs;
    }
    
    /**
     * @dev Update metadata URI for a job NFT
     */
    function updateMetadataURI(uint256 _jobId, string memory _newURI) external {
        require(_jobId < _nextTokenId, "Job does not exist");
        require(ownerOf(_jobId) == msg.sender, "Only NFT owner can update");
        _setTokenURI(_jobId, _newURI);
        jobs[_jobId].metadataURI = _newURI;
    }

    // Override required by Solidity for ERC721URIStorage
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // Legacy functions for backward compatibility (deprecated)
    function getJobData() external view returns (JobListingData memory) {
        // Returns the first job for backward compatibility
        require(_nextTokenId > 0, "No jobs available");
        return jobs[0];
    }

    function getApplications() external view returns (Application[] memory) {
        // Returns applications for the first job for backward compatibility
        require(_nextTokenId > 0, "No jobs available");
        return jobApplications[0];
    }
}

