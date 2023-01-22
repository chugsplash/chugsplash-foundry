// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "../src/contracts/ChugSplash.sol";
import "../src/Storage.sol";
import { SimpleStorage } from "../src/SimpleStorage.sol";
import { ChugSplashRegistry, ChugSplashManager, Proxy } from "chugsplash/packages/contracts/contracts/ChugSplashRegistry.sol";

/* ChugSplash Foundry Library Tests
 *  
 * These integration tests are intended to verify that the ChugSplash Foundry Library is properly interfacing with
 * the core ChugSplash library and contracts. We also include sanity check tests here that verify the variable encoding 
 * and deployment process is working correctly. 
 *
 * However, these tests are not designed to fully test the ChugSplash contracts. You can find the main ChugSplash contract tests here: 
 * https://github.com/chugsplash/chugsplash/tree/develop/packages/contracts/test
 */

contract ChugSplashTest is Test {
    Proxy claimedProxy;
    Proxy transferredProxy;
    Storage myStorage;
    SimpleStorage mySimpleStorage;
    SimpleStorage mySimpleStorage2;
    ChugSplashRegistry registry;
    ChugSplash chugsplash;

    string deployConfig = "./chugsplash/deploy.t.ts";

    string withdrawProjectName = "Withdraw test";
    string withdrawConfig = "./chugsplash/withdraw.t.ts";

    string registerProjectName = 'Register, propose, fund, approve test';
    string registerConfig = "./chugsplash/registerProposeFundApprove.t.ts";

    string cancelProjectName = "Cancel test";
    string cancelConfig = "./chugsplash/cancel.t.ts";

    // This is just an anvil test key
    string newProposerPrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    address newProposer = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    string addProposerProjectName = "Add proposer test";
    string addProposerConfig = "./chugsplash/addProposer.t.ts";

    string claimConfig = "./chugsplash/claim.t.ts";

    string transferProjectName = "Transfer test";
    string transferConfig = "./chugsplash/transfer.t.ts";

    struct SimpleStruct { bytes32 a; uint128 b; uint128 c; }

    function setUp() public {
        chugsplash = new ChugSplash();
        vm.makePersistent(address(chugsplash));

        // Setup deployment test
        chugsplash.deploy(deployConfig, true);

        // Deploy claim proxy test
        chugsplash.deploy(claimConfig, true);
        chugsplash.claimProxy(claimConfig, "MySimpleStorage", true);

        // Start transfer proxy test
        chugsplash.deploy(transferConfig, true);
        chugsplash.claimProxy(transferConfig, "MySimpleStorage", true);

        // Setup register, propose, fund, approve process test
        chugsplash.register(registerConfig, true);
        chugsplash.propose(registerConfig, false, true);
        chugsplash.fund(registerConfig, 1 ether, true);
        chugsplash.approve(registerConfig, true, true);

        // Setup withdraw test
        chugsplash.register(withdrawConfig, true);
        chugsplash.fund(withdrawConfig, 1 ether, true);
        chugsplash.withdraw(withdrawConfig, true);

        // Setup cancel test
        chugsplash.register(cancelConfig, true);
        chugsplash.propose(cancelConfig, false, true);
        chugsplash.fund(cancelConfig, 1 ether, true);
        chugsplash.approve(cancelConfig, true, true);
        chugsplash.cancel(cancelConfig, true);

        // Setup add proposer test
        chugsplash.register(addProposerConfig, true);
        chugsplash.addProposer(addProposerConfig, newProposer, true);
        vm.setEnv("PRIVATE_KEY", newProposerPrivateKey);
        chugsplash.propose(addProposerConfig, false, true);

        // Refresh EVM state to reflect chain state after ChugSplash transactions
        chugsplash.refresh();

        chugsplash.transferProxy(transferConfig, chugsplash.getAddress(transferConfig, "MySimpleStorage"), true);
        claimedProxy = Proxy(payable(chugsplash.getAddress(claimConfig, "MySimpleStorage")));
        transferredProxy = Proxy(payable(chugsplash.getAddress(transferConfig, "MySimpleStorage")));
        myStorage = Storage(chugsplash.getAddress(deployConfig, "MyStorage"));
        mySimpleStorage = SimpleStorage(chugsplash.getAddress(deployConfig, "MySimpleStorage"));

        registry = ChugSplashRegistry(chugsplash.getRegistryAddress());
    }

    function testDidClaimProxy() public {
        assertEq(chugsplash.getEIP1967ProxyAdminAddress(address(claimedProxy)), 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    }

    function testDidTransferProxy() public {
        ChugSplashManager manager = registry.projects(transferProjectName);
        assertEq(chugsplash.getEIP1967ProxyAdminAddress(address(transferredProxy)), address(manager));
    }

    function testDidRegister() public {
        assertTrue(address(registry.projects('Doesnt exist')) == address(0), "Unregistered project detected");
        assertFalse(address(registry.projects(registerProjectName)) == address(0), "Registered project was not detected");
    }

    function testDidProposeFundApprove() public {
        ChugSplashManager manager = registry.projects(registerProjectName);
        assertTrue(address(manager).balance == 1 ether, "Manager was not funded");
        assertTrue(manager.activeBundleId() != 0, "No active bundle id detected");
    }

    function testDidWithdraw() public {
        ChugSplashManager manager = registry.projects(withdrawProjectName);
        assertTrue(address(manager).balance == 0 ether, "Manager balance not properly withdrawn");
    }

    function testDidCancel() public {
        ChugSplashManager manager = registry.projects(cancelProjectName);
        assertTrue(manager.activeBundleId() == 0, "Bundle still active");
    }

    function testDidAddProposer() public {
        ChugSplashManager manager = registry.projects(addProposerProjectName);
        assertTrue(manager.proposers(newProposer));
    }

    function testSetContractReference() public {
        assertEq(address(mySimpleStorage.myStorage()), address(myStorage));
    }

    function testSetMinInt256() public {
        assertEq(myStorage.minInt256(), type(int256).min);
    }

    function testSetMinInt8() public {
        assertEq(myStorage.minInt8(), type(int8).min);
    }

    function testSetMinUint8() public {
        assertEq(myStorage.uint8Test(), 255);
    }

    function testSetBool() public {
        assertEq(myStorage.boolTest(), true);
    }

    function testSetString() public {
        assertEq(myStorage.stringTest(), 'testString');
    }

    function testLongString() public {
        assertEq(myStorage.longStringTest(), 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz');
    }

    function testSetBytes() public {
        assertEq(myStorage.bytesTest(), hex"abcd1234");
    }

    function testSetLongBytes() public {
        assertEq(myStorage.longBytesTest(), hex"123456789101112131415161718192021222324252627282930313233343536373839404142434445464");
    }

    function testSetContract() public {
        assertEq(address(myStorage.contractTest()), 0x1111111111111111111111111111111111111111);
    }

    function testSetEnum() public {
        assertEq(uint(myStorage.enumTest()), 1);
    }

    function testSetStruct() public {
        (bytes32 a, uint128 b, uint128 c) = myStorage.simpleStruct();
        assertEq(a, hex"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        assertEq(b, 12345);
        assertEq(c, 54321);
    }

    function testSetStringToStringMapping() public {
        assertEq(myStorage.stringToStringMapping('testKey'), 'testVal');
    }

    function testSetStringToUintMapping() public {
        assertEq(myStorage.stringToUint256Mapping('testKey'), 12341234);
    }

    function testSetStringToBoolMapping() public {
        assertEq(myStorage.stringToBoolMapping('testKey'), true);
    }

    function testSetStringToAddressMapping() public {
        assertEq(myStorage.stringToAddressMapping('testKey'), 0x1111111111111111111111111111111111111111);
    }

    function testSetStringToStructMapping() public {
        (bytes32 a, uint128 b, uint128 c) = myStorage.stringToStructMapping('testKey');
        assertEq(a, hex"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        assertEq(b, 12345);
        assertEq(c, 54321);
    }

    function testSetLongStringMappingtoLongString() public {
        string memory key = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz';
        assertEq(myStorage.longStringToLongStringMapping(key), key);
    }

    function testSetComplexStruct() public {
        (int32 a) = myStorage.complexStruct();
        assertEq(a, 4);
        assertEq(myStorage.getComplexStructMappingVal(5), 'testVal');
    }

    function testSetUint64FixedSizeArray() public {
        uint16[5] memory expectedValues = [1, 10, 100, 1_000, 10_000];
        for (uint i = 0; i < 5; i++) {
            assertEq(myStorage.uint64FixedArray(i), expectedValues[i]);
        }
    }

    function testSetUint128FixedSizeNestedArray() public {
        uint8[5][6] memory nestedArray = [
            [1, 2, 3, 4, 5],
            [6, 7, 8, 9, 10],
            [11, 12, 13, 14, 15],
            [16, 17, 18, 19, 20],
            [21, 22, 23, 24, 25],
            [26, 27, 28, 29, 30]
        ];
        for (uint i = 0; i < nestedArray.length; i++) {
            for (uint j = 0; j < nestedArray[i].length; j++) {
                assertEq(myStorage.uint128FixedNestedArray(i, j), nestedArray[i][j]);
            }
        }
    }

    function testSetUint64FixedSizeMultiNestedArray() public {
        uint8[2][2][2] memory multiNestedArray = [
            [[1, 2], [3, 4]],
            [[5, 6], [7, 8]]
        ];

        for (uint i = 0; i < multiNestedArray.length; i++) {
            for (uint j = 0; j < multiNestedArray[i].length; j++) {
                for (uint k = 0; k < multiNestedArray[i][j].length; k++) {
                    assertEq(myStorage.uint64FixedMultiNestedArray(i, j, k), multiNestedArray[i][j][k]);
                }
            }
        }
    }

    function testSetInt64DynamicArray() public {
        int24[7] memory int64DynamicArray = [-5, 50, -500, 5_000, -50_000, 500_000, -5_000_000];
        for (uint i = 0; i < int64DynamicArray.length; i++) {
            assertEq(myStorage.int64DynamicArray(i), int64DynamicArray[i]);
        }
    }

    function testSetDynamicSimpleStructArray() public {
        SimpleStruct[3] memory structArray = [
            SimpleStruct(hex'abababababababababababababababababababababababababababababababab', 12345, 54321),
            SimpleStruct(hex'cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd', 100_000_000, 999_999_999),
            SimpleStruct(hex'efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef', 56789, 98765)
        ];

        for (uint i = 0; i < structArray.length; i++) {
            (bytes32 a, uint128 b, uint128 c) = myStorage.simpleStructDynamicArray(i);
            assertEq(a, structArray[i].a);
            assertEq(b, structArray[i].b);
            assertEq(c, structArray[i].c);
        }
    }

    function testSetUint256MappingToString() public {
        assertEq(myStorage.uint256ToStringMapping(12341234), 'testVal');
    }

    function testSetUint8MappingToString() public {
        assertEq(myStorage.uint8ToStringMapping(255), 'testVal');
    }

    function testSetUint128MappingToString() public {
        assertEq(myStorage.uint128ToStringMapping(1234), 'testVal');
    }

    function testSetInt256MappingToString() public {
        assertEq(myStorage.int256ToStringMapping(-1), 'testVal');
    }


    function testSetInt8MappingToString() public {
        assertEq(myStorage.int8ToStringMapping(-10), 'testVal');
    }

    function testSetInt128MappingToString() public {
        assertEq(myStorage.int128ToStringMapping(-1234), 'testVal');
    }

    function testSetAddressMappingToString() public {
        assertEq(myStorage.addressToStringMapping(0x1111111111111111111111111111111111111111), 'testVal');
    }

    function testSetBytesMappingToString() public {
        assertEq(myStorage.bytesToStringMapping(hex"abcd1234"), 'testVal');
    }

    function testSetNestedStringMapping() public {
        assertEq(myStorage.nestedMapping('testKey', 'nestedKey'), 'nestedVal');
    }

    function testSetMultiNestedMapping() public {
        assertEq(myStorage.multiNestedMapping(1, 'testKey', 0x1111111111111111111111111111111111111111), 2);
    }
}