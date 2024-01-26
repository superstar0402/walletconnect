import { Core } from "@walletconnect/core";
import { ICore } from "@walletconnect/types";
import { Web3Wallet, IWeb3Wallet } from "@walletconnect/web3wallet";

export let web3wallet: IWeb3Wallet;
export let core: ICore;

const relayerURL = "wss://relay.walletconnect.com";

export async function createWeb3Wallet() {
  if (core) {
    return;
  }
  core = new Core({
    logger: "debug",
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    relayUrl: relayerURL,
  });

  web3wallet = await Web3Wallet.init({
    core,
    metadata: {
      name: "Ledger Wallet",
      description: "Ledger Live Wallet with WalletConnect",
      url: "https://walletconnect.com/",
      icons: ["https://avatars.githubusercontent.com/u/37784886"],
    },
  });
}

function pair(uri: string) {
  return core.pairing.pair({ uri });
}

export async function startProposal(uri: string) {
  try {
    const url = new URL(uri);

    switch (url.protocol) {
      // handle usual wallet connect URIs
      case "wc:": {
        await pair(uri);
        break;
      }

      // handle Ledger Live specific URIs
      case "ledgerlive:": {
        const uriParam = url.searchParams.get("uri");

        if (url.pathname === "//wc" && uriParam) {
          await startProposal(uriParam);
        }
        break;
      }
    }
  } catch (error) {
    // bad urls are just ignored
    if (error instanceof TypeError) {
      return;
    }
    throw error;
  }
}
