// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.26;

import "forge-std/Script.sol";

/// @notice Idempotent deploy of HawkingMulticall — a 1:1 vendor fork (branding rename
/// only) of PancakeSwap's PancakeInterfaceMulticallV2, fetched from its verified BSC
/// mainnet source at 0x39eecaE833c944ebb94942Fa44CaE46e87a8Da17 (Sourcify match
/// 29078989, solc 0.7.6+commit.7338295f). The frontend multicall package
/// (apps/web/packages/multicall) requires exactly this ABI (gasLeft/gaslimit/multicall/
/// multicallWithGasLimitation) — canonical Multicall3 does not implement it.
///
/// Deployed via vm.deployCode (raw artifact bytecode) rather than `new HawkingMulticall()`
/// because the vendored source is pinned to solc =0.7.6 while this script compiles under
/// 0.8.26 — the two are not part of the same solc compilation graph.
///
/// Idempotent: skips the deploy if packages/deployments/base-sepolia.json already has
/// infra.HawkingMulticall pointing at an address with on-chain code. Writes the address
/// back into the registry on a fresh deploy.
contract DeployMulticall is Script {
    string constant REGISTRY_PATH = "../../packages/deployments/base-sepolia.json";
    string constant ARTIFACT = "HawkingMulticall.sol:HawkingMulticall";

    function run() external {
        string memory json = vm.readFile(REGISTRY_PATH);

        address existing;
        bool hasExisting;
        if (vm.keyExistsJson(json, ".infra.HawkingMulticall")) {
            existing = vm.parseJsonAddress(json, ".infra.HawkingMulticall");
            hasExisting = true;
        }

        if (hasExisting && existing.code.length > 0) {
            console.log("HawkingMulticall already deployed (skip):", existing);
            return;
        }

        vm.startBroadcast();
        address deployed = vm.deployCode(ARTIFACT);
        vm.stopBroadcast();

        require(deployed.code.length > 0, "deploy failed: no code at deployed address");

        console.log("HawkingMulticall deployed at:", deployed);
        console.log("deploy block:", block.number);

        vm.writeJson(vm.toString(deployed), REGISTRY_PATH, ".infra.HawkingMulticall");
        console.log("registry updated: infra.HawkingMulticall =", deployed);
    }
}
