import React from 'react';
import { useWallet } from '../hooks/useWallet';

function WalletConnect() {
  const { account, connectWallet, disconnectWallet, isConnecting, isConnected } = useWallet();

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center gap-3">
      {isConnected ? (
        <div className="flex items-center gap-2 p-1 pr-2 bg-emerald-50/50 backdrop-blur-md rounded-full border border-emerald-100/50 shadow-sm transition-all hover:shadow-md">
          <div className="badge badge-success badge-lg gap-2 font-medium bg-emerald-100 text-emerald-800 border-none h-8 min-w-[120px] justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {formatAddress(account)}
          </div>
          <button
            onClick={disconnectWallet}
            className="btn btn-sm btn-ghost btn-circle hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Disconnect"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="btn btn-primary btn-sm rounded-full px-6 font-semibold shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:shadow-emerald-200/60 transition-all hover:-translate-y-0.5"
        >
          {isConnecting ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Connecting...
            </>
          ) : (
            'Connect Wallet'
          )}
        </button>
      )}
    </div>
  );
}

export default WalletConnect;

