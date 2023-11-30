import { useCallback, useState } from "react";
import { useNavigation } from "@/hooks/common/useNavigation";
import { sessionSelector, useSessionsStore } from "@/storage/sessions.store";
import { accountSelector, useAccountsStore } from "@/storage/accounts.store";
import { getNamespace } from "@/helpers/helper.util";
import { EIP155_SIGNING_METHODS } from "@/data/methods/EIP155Data.methods";
import { web3wallet } from "@/helpers/walletConnect.util";
import useAnalytics from "@/hooks/common/useAnalytics";
import { useLedgerLive } from "../common/useLedgerLive";
import { SupportedNamespace } from "@/data/network.config";
import { Routes, TabsIndexes } from "@/shared/navigation";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { ProposalProps, formatAccountsByChain } from "@/hooks/useProposal/util";

export function useProposal({ proposal }: ProposalProps) {
  const { navigate, router } = useNavigation();

  const addSession = useSessionsStore(sessionSelector.addSession);
  const accounts = useAccountsStore(accountSelector.selectAccounts);
  const addAccount = useAccountsStore(accountSelector.addAccount);
  const analytics = useAnalytics();

  const { initWalletApiClient, closeTransport } = useLedgerLive();

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const proposer = proposal.params.proposer;

  const handleClick = useCallback(
    (account: string) => {
      if (selectedAccounts.includes(account)) {
        setSelectedAccounts(selectedAccounts.filter((s) => s !== account));
      } else {
        setSelectedAccounts([...selectedAccounts, account]);
      }
    },
    [selectedAccounts],
  );

  const handleClose = () => {
    router.push(Routes.Home);
    analytics.track("button_clicked", {
      button: "Close",
      page: "Wallet Connect Error Unsupported Blockchains",
    });
  };

  const buildSupportedNamespaces = (): Record<
    string,
    {
      chains: string[];
      methods: string[];
      events: string[];
      accounts: string[];
    }
  > => {
    const accountsByChain = formatAccountsByChain(proposal, accounts).filter(
      (a) => a.accounts.length > 0 && a.isSupported,
    );
    const dataToSend = accountsByChain.reduce<{ account: string; chain: string }[]>(
      (accum, elem) =>
        accum.concat(
          elem.accounts
            .filter((acc) => selectedAccounts.includes(acc.id))
            .map((a) => ({
              account: `${getNamespace(a.currency)}:${a.address}`,
              chain: getNamespace(a.currency),
            })),
        ),
      [],
    );

    const requiredNamespaces = proposal.params.requiredNamespaces;
    const namespace =
      requiredNamespaces && Object.keys(requiredNamespaces).length > 0
        ? requiredNamespaces[SupportedNamespace.EIP155]
        : { methods: [] as string[], events: [] as string[] };

    const methods = [...new Set(namespace.methods.concat(Object.values(EIP155_SIGNING_METHODS)))];
    const events = [
      ...new Set(
        namespace.events.concat([
          "session_proposal",
          "session_request",
          "auth_request",
          "session_delete",
        ]),
      ),
    ];

    return {
      [SupportedNamespace.EIP155]: {
        chains: [...new Set(dataToSend.map((e) => e.chain))],
        methods,
        events,
        accounts: dataToSend.map((e) => e.account),
      },
    };
  };

  const approveSession = () => {
    web3wallet
      .approveSession({
        id: proposal.id,
        namespaces: buildApprovedNamespaces({
          proposal: proposal.params,
          supportedNamespaces: buildSupportedNamespaces(),
        }),
      })
      .then((res) => {
        addSession(res);
        navigate(Routes.SessionDetails, res.topic);
      })
      .catch((error) => {
        console.error(error);
        // TODO : display error toast
        navigate(Routes.Home, { tab: TabsIndexes.Connect });
      });
  };

  const rejectSession = () => {
    web3wallet
      .rejectSession({
        id: proposal.id,
        reason: {
          code: 5000,
          message: "USER_REJECTED_METHODS",
        },
      })
      .finally(() => navigate(Routes.Home));
  };

  const addNewAccount = async (currency: string) => {
    const walletApiClient = initWalletApiClient();
    try {
      const newAccount = await walletApiClient.account.request({
        currencyIds: [currency],
      });
      addAccount(newAccount);
    } catch (error) {
      console.error("request account canceled by user");
    }
    closeTransport();
  };

  return {
    approveSession,
    rejectSession,
    proposer,
    handleClose,
    handleClick,
    accounts,
    selectedAccounts,
    formatAccountsByChain,
    addNewAccount,
  };
}
