/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

jest.mock('@salesforce/scv-connector-base', () => ({
    ...(jest.requireActual('@salesforce/scv-connector-base')),
    publishEvent: jest.fn(),
    log: jest.fn()
}));

import constants from './testConstants';
import { publishEvent, log, GenericResult, PhoneCall, Contact, ParticipantResult, CallInfo, CallResult,
    LogoutResult, Constants, Phone, AgentStatusInfo, HangupResult, SupervisedCallInfo, PhoneCallAttributes } from '@salesforce/scv-connector-base';
import { Connector } from '../main/connector';

global.console.log = jest.fn(); //do not print console.log 

jest.useFakeTimers();
            
describe('Vendor Sdk tests', () => {
    const connector = new Connector();
    const vendorSdk = connector.sdk;
    const dummyPhoneNumber = 'dummyPhonenumber';
    const dummyCallAttributes = { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER };
    
    beforeAll(async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ voiceCallId: "someId" })
            })
        );
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    beforeEach(() => {
        beforeEach(() => {
            vendorSdk.state.activeCalls = {};
            vendorSdk.state.agentAvailable = true;
            vendorSdk.state.agentConfig = {
                selectedPhone : {type:"SOFT_PHONE"}
            };
            vendorSdk.state.capabilities = {
                hasMute: true,
                hasMerge: true,
                hasRecord: true,
                hasSwap: true,
                hasSignedRecordingUrl: false
            };
        });
    });

    describe('handleSocketMessage', () => {
        beforeEach(() => {
            jest.spyOn(vendorSdk, 'connectParticipant').mockImplementation((args) => args);
            jest.spyOn(vendorSdk, 'publishCallBargedInEventToAgents').mockImplementation((args) => args);
            jest.spyOn(vendorSdk, 'log').mockImplementation((args) => args);
        });
        afterEach(() => {
            jest.restoreAllMocks();
        })
        it('Should handle CALL_STARTED message', () => {
            const message = { 
                messageType: constants.USER_MESSAGE.CALL_STARTED,
                data: { phoneNumber: "phoneNumber",
                        callId: "callId",
                        voiceCallId: "voiceCallId"
                 }
             };
             vendorSdk.handleSocketMessage(message);
             const call = new PhoneCall({
                   callType: "inbound",
                   phoneNumber: "phoneNumber",
                   callId: "callId",
                   callInfo: new CallInfo({isOnHold:false}),
                   callAttributes: new PhoneCallAttributes({participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER, voiceCallId : "voiceCallId" })
             });
             let callResult = new CallResult({call});
             expect(Object.keys(vendorSdk.state.activeCalls).length).toEqual(1);
             expect(vendorSdk.state.activeCalls).toEqual({"callId" : call});
             expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.CALL_STARTED, payload: callResult});
        });

        it('Should handle PARTICIPANT_CONNECTED message', () => {
            const message = { 
                messageType: constants.USER_MESSAGE.PARTICIPANT_CONNECTED,
                data: {
                    phoneNumber: 'dummyNumber',
                    callInfo: 'dummyCallInfo'
                }
             };
            vendorSdk.handleSocketMessage(message);
            expect(vendorSdk.connectParticipant).toBeCalled();
        });

        it('Should handle CALL_BARGED_IN message', () => {
            const message = { 
                messageType: constants.USER_MESSAGE.CALL_BARGED_IN,
                data: {
                    phoneNumber: 'dummyNumber',
                    callInfo: 'dummyCallInfo'
                }
             };
            vendorSdk.handleSocketMessage(message);
            expect(vendorSdk.publishCallBargedInEventToAgents).toBeCalled();
        });

        it('log message that cannot be handled', () => {
            const message = { 
                messageType: 'invalidMessage'
             };
            vendorSdk.handleSocketMessage(message);
            expect(vendorSdk.log).toBeCalledWith("Could not handle message " + message.messageType, message);
        });
    });


    describe('init', () => {
        beforeEach(() => {
            global.fetch = jest.fn(() => 
                Promise.resolve({
                    json: () => Promise.resolve({ success: true })
                })
            );
        });
        
        it('Should fail when tenant info is not configured properly', async () => {
            global.fetch = jest.fn(() => 
                Promise.resolve({
                    json: () => Promise.resolve({ success: false })
                })
            );
            await expect(connector.init(constants.CALL_CENTER_CONFIG)).rejects.toBe("Failed to configure tentant information");
        });

        it('Should return a showLogin when showLoginPage is true', async () => {
            vendorSdk.state.showLoginPage = true;
            const result = await connector.init(constants.CALL_CENTER_CONFIG);
            expect(result.showLogin).toBeTruthy();
            expect(result.loginFrameHeight).toBe(350);
        });

        it('Should NOT return a showLogin when showLoginPage is false', async () => {
            vendorSdk.state.showLoginPage = false;
            const result = await connector.init(constants.CALL_CENTER_CONFIG);
            expect(result.showLogin).toBeFalsy();
        });
    });

    describe('getActiveCalls', () => {
        beforeEach(() => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve({ voiceCallId: "someId", success : true })
                })
            );
        });
        
        it('Should return a valid active calls result on getActiveCalls', async () => {
            const callResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const result = await connector.getActiveCalls();
            expect(Object.keys(result.activeCalls).length).toEqual(1);
            Object.values(result.activeCalls).forEach(call => {
                expect(call.callId).toBeTruthy();
            });
            await vendorSdk.endCall(callResult.call);
        });

        it('Should return a empty active calls result on getActiveCalls', async () => {
            const result = await connector.getActiveCalls();
            expect(Object.keys(result.activeCalls).length).toEqual(0);
        });
    });

    describe('acceptCall', () => {
        it('Should reject on invalid call', async () => {
            const nonExistantCall = new PhoneCall({ callId: 'callId', callType: 'inbound', state: 'state', callAttributes: {}, phoneNumber: '100'});
            try {
                await connector.acceptCall(nonExistantCall);
            } catch (e) {
                expect(e.message).toEqual("Couldn't find an active call");
            }
        });

        
        it('Should return a valid call result on acceptCall', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.acceptCall(call);
            expect(result.call).toBe(call);
        });

        it('Should return a valid call result on acceptCall for callback', async () => {
            connector.sdk.requestCallback({ phoneNumber: '100' });

            const result = await connector.acceptCall(new PhoneCall({
                callAttributes: { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER }
            }));
            expect(result.call.state).toBe(Constants.CALL_STATE.RINGING);
        });

        it('Should return a rejected promise if throwError is set', async () => {
            vendorSdk.throwError(true);
            connector.sdk.requestCallback({ phoneNumber: '100' });
            const phoneCall = new PhoneCall({
                callAttributes: { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER }
            });
            await expect(connector.acceptCall(phoneCall)).rejects.toStrictEqual('demo error');
        });
        afterAll(() => {
            vendorSdk.throwError(false);
        });
    });

    describe('connectCall', () => {
        it('Should publish a valid call result on connectCall', async () => {
            const result = await connector.dial(new Contact({ phoneNumber: '100'}));
            vendorSdk.connectCall({ removeParticipantVariant : Constants.REMOVE_PARTICIPANT_VARIANT.ALWAYS });
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.CALL_CONNECTED, payload: new CallResult({ call: result.call })});
        });
    });

    describe('declineCall', () => {
        it('Should return a valid call result on declineCall', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.declineCall(call);
            expect(result.call).toBe(call);
        });

        it('Should return a valid call result on declineCall', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.declineCall();
            expect(result.call).toBe(call);
        });
    });

    describe('endCall', () => {
        it('Should return a valid call result on endCall', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.endCall(call);
            expect(result.calls.pop()).toBe(call);
        });

        it('Should return a valid call result on endCall for Agent for Initial Caller & Third party', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.THIRD_PARTY });
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.AGENT });
            const { call } = startCallResult;

            await expect(connector.endCall(call)).resolves.not.toThrow();
        });

        it('Should return a valid call result on endCall for Agent for just Initial caller', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.AGENT });
            const { call } = startCallResult;
            try {
                connector.endCall(call);
            } catch(e) {
                expect(e.message).toEqual("Couldn't find an active call for participant " + constants.PARTICIPANT_TYPE.THIRD_PARTY);
            }
        });

        it('Should throw an error on endCall for Agent with just Third party but no initial caller', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.THIRD_PARTY });
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.AGENT });
            const { call } = startCallResult;
            try {
                connector.endCall(call);
            } catch(e) {
                expect(e.message).toEqual("Couldn't find an active call for participant " + constants.PARTICIPANT_TYPE.INITIAL_CALLER);
            }
        });

        it('Should publish wrap-up started', async () => {
            jest.useFakeTimers();
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            await connector.endCall(call);
            jest.runAllTimers();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.AFTER_CALL_WORK_STARTED, payload: { callId: call.callId }});
        });

        it('Should return a rejected promise if throwError is set', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            vendorSdk.throwError(true);
            const { call } = startCallResult;
            await expect(connector.endCall(call)).rejects.toStrictEqual('demo error');
        });
        afterAll(() => {
            vendorSdk.throwError(false);
        });
    });

    
    describe('dial', () => {
        it('Should return a valid call result on dial', async () => {
            const contact = new Contact({ phoneNumber: '100'});

            const result = await connector.dial(contact);
            expect(result.call.callType).toBe(Constants.CALL_TYPE.OUTBOUND.toLowerCase());
            expect(result.call.contact).toBe(contact);
            expect(result.call.callInfo.callStateTimestamp instanceof Date).toBeTruthy();
            expect(result.call.callAttributes.participantType).toBe(Constants.PARTICIPANT_TYPE.INITIAL_CALLER);
        });
        it('Should return a valid call result on dial on softphone', async () => {
            const contact = new Contact({ phoneNumber: '100'});

            const result = await vendorSdk.dial(contact, { isSoftphoneCall: true });
            expect(result.call.callType).toBe(Constants.CALL_TYPE.OUTBOUND.toLowerCase());
            expect(result.call.contact).toBe(contact);
            expect(result.call.callInfo.callStateTimestamp instanceof Date).toBeTruthy();
            expect(result.call.callAttributes.participantType).toBe(Constants.PARTICIPANT_TYPE.INITIAL_CALLER);
            expect(publishEvent).not.toBeCalled();
        });
        it('Should return a valid call result on dial from hardphone', async () => {
            const contact = new Contact({ phoneNumber: '100'});

            const result = await vendorSdk.dial(contact, { isSoftphoneCall: false });
            expect(result.call.callType).toBe(Constants.CALL_TYPE.OUTBOUND.toLowerCase());
            expect(result.call.contact).toBe(contact);
            expect(result.call.callInfo.callStateTimestamp instanceof Date).toBeTruthy();
            expect(result.call.callAttributes.participantType).toBe(Constants.PARTICIPANT_TYPE.INITIAL_CALLER);
            expect(result.call.callInfo.isSoftphoneCall).toBe(false);
        });
        it('Should throw error on dial if there is already an active call', async () => {
            const contact1 = new Contact({ phoneNumber: '100'});
            const contact2 = new Contact({ phoneNumber: '200'});
            await vendorSdk.dial(contact1, { isSoftphoneCall: false });
            vendorSdk.dial(contact2, { isSoftphoneCall: false }).catch((error) => {
                expect(error.message).toEqual("Agent is not available for an outbound call");
            })
        });
        it('Should return a valid call result on dial from hardphone on remote', async () => {
            const contact = new Contact({ phoneNumber: '100'});
            const result = await vendorSdk.dial(contact, { isSoftphoneCall: false }, true);
            expect(result.call.callType).toBe(Constants.CALL_TYPE.OUTBOUND.toLowerCase());
            expect(result.call.contact).toBe(contact);
            expect(result.call.callInfo.callStateTimestamp instanceof Date).toBeTruthy();
            expect(result.call.callAttributes.participantType).toBe(Constants.PARTICIPANT_TYPE.INITIAL_CALLER);
            expect(result.call.callInfo.isSoftphoneCall).toBe(false);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.CALL_STARTED, payload: result });
        });

    });

    describe('logout', () => {
        it('Should return a valid generic result on logout', async () => {
            const result = await connector.logout();
            expect(result.success).toBeTruthy();
        });
    });

    describe('getAgentConfig', () => {
        it('Should return a valid agent config result on getAgentConfig', async () => {
            const result = await connector.getAgentConfig();
            expect(result.selectedPhone).toEqual(vendorSdk.state.agentConfig.selectedPhone);
        });
    });

    describe('updateAgentConfig', () => {

        it('setAgentConfig from sfdc', async () => {
            const selectedPhone = new Phone ({type:"DESK_PHONE", number: "111 333 0456"});
            connector.setAgentConfig({ selectedPhone });
            expect(vendorSdk.state.agentConfig.selectedPhone).toEqual(selectedPhone);
        });

        it('setAgentConfig from sfdc when phone type is not changed and just number is updated', async () => {
            const selectedPhone = new Phone ({type:"DESK_PHONE", number: "111 000 1111"});
            connector.setAgentConfig({ selectedPhone });
            expect(vendorSdk.state.agentConfig.selectedPhone).toEqual(selectedPhone);
        });

        it('updateAgentConfig from simulator', async () => {
            vendorSdk.updateAgentConfig({
                selectedPhone : {type:"SOFT_PHONE"}
            });
            expect(vendorSdk.state.agentConfig.selectedPhone.type).toEqual("SOFT_PHONE");
            expect(vendorSdk.state.agentConfig.selectedPhone.number).toBeUndefined();
        });
    });

    describe('getCapabilities', () => {
        it('Should return a valid agent config result on getCapabilities', async () => {
            const result = await connector.getCapabilities();
            expect(result.hasMute).toEqual(vendorSdk.state.capabilities.hasMute);
            expect(result.hasMerge).toEqual(vendorSdk.state.capabilities.hasMerge);
            expect(result.hasRecord).toEqual(vendorSdk.state.capabilities.hasRecord);
            expect(result.hasSwap).toEqual(vendorSdk.state.capabilities.hasSwap);
        });
    });

    describe('updateCapabilities', () => {

        it('updateAgentConfig from simulator', async () => {
            vendorSdk.updateCapabilities({
                hasMute: false,
                hasMerge: false,
                hasRecord: false,
                hasSwap: false
            });
            expect(vendorSdk.state.capabilities.hasMute).toEqual(false);
            expect(vendorSdk.state.capabilities.hasMerge).toEqual(false);
            expect(vendorSdk.state.capabilities.hasRecord).toEqual(false);
            expect(vendorSdk.state.capabilities.hasSwap).toEqual(false);
        });

        it('setCapabilities from simulator', async () => {
            const capabilitiesPayload = {
                [Constants.MOS] : true,
                [Constants.RECORD] : true
            };
            connector.setCapabilities( capabilitiesPayload );
            expect(vendorSdk.state.capabilities.MOS).toEqual(capabilitiesPayload.MOS);
            expect(vendorSdk.state.capabilities.RECORD).toEqual(capabilitiesPayload.RECORD);
        });
    });

    describe('mute', () => {
        it('Should return a valid mute toggle result on mute', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const result = await connector.mute();
            expect(result.isMuted).toBeTruthy();
        });
    });

    describe('unmute', () => {
        it('Should return a valid mute toggle result on unmute', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const result = await connector.unmute();
            expect(result.isMuted).toBeFalsy();
        });
    });

    describe('hold', () => {
        it('Should return a valid hold toggle result on hold', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.hold(call);
            expect(result.isThirdPartyOnHold).toBeFalsy();
            expect(result.isCustomerOnHold).toBeTruthy();
            expect(result.calls).toEqual(vendorSdk.state.activeCalls);
        });
        it('Should return undefined when isOnHold is called for an invalid call', async () => {
            const result = vendorSdk.isOnHold({});
            expect(result).toBeUndefined();
        });
    });

    describe('resume', () => {
        it('Should return a valid hold toggle result on resume', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.resume(call);
            expect(result.isThirdPartyOnHold).toBeFalsy();
            expect(result.isCustomerOnHold).toBeFalsy();
            expect(result.calls).toEqual(vendorSdk.state.activeCalls);
        });
    });

    describe('pauseRecording', () => {
        it('Should return a valid recording toggle result on pauseRecording', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.pauseRecording(call);
            expect(result.isRecordingPaused).toBeTruthy();
        });
    });

    describe('resumeRecording', () => {
        it('Should return a valid recording toggle result on resumeRecording', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;

            const result = await connector.resumeRecording(call);
            expect(result.isRecordingPaused).toBeFalsy();
        });
    });

    describe('swap', () => {
        it('Should return a valid hold toggle result on swap', async () => {
            const startCallResult1 = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const call1 = startCallResult1.call;
            const startCallResult2 = await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.THIRD_PARTY });
            const call2 = startCallResult2.call;

            const result = await connector.swap(call1, call2);
            expect(result.isThirdPartyOnHold).toBe(false);
            expect(result.isCustomerOnHold).toBe(false);
            expect(result.calls).toEqual(vendorSdk.state.activeCalls);
        });
        it('Should not error on swap when call2 is invalid', async () => {
            const startCallResult1 = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const call1 = startCallResult1.call;
            const invalidParticipant = "invalid";
            const startCallResult2 = await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: invalidParticipant });
            const call2 = startCallResult2.call;
            try {
                vendorSdk.swapCalls(call1, call2);
            } catch(e) {
                expect(e.message).toEqual("Couldn't find an active call for participant " + invalidParticipant);
            }
        });
    });

    describe('conference', () => {
        it('Should return a valid conference result on conference', async () => {
            const startCallResult1 = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const call1 = startCallResult1.call;
            const startCallResult2 = await vendorSdk.startInboundCall(dummyPhoneNumber, { participantType: constants.PARTICIPANT_TYPE.THIRD_PARTY });
            const call2 = startCallResult2.call;
            const calls = [call1, call2];

            const result = await connector.conference(calls);
            expect(result.isThirdPartyOnHold).toBeFalsy();
            expect(result.isCustomerOnHold).toBeFalsy();
        });
    });

    describe('addParticipant', () => {
        beforeEach(() => {
            vendorSdk.state.onlineUsers = ['dummyUser'];
            vendorSdk.messageUser = jest.fn();
        });

        it('Should return a participant result on addParticipant', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ id: 'dummyUser', phoneNumber: dummyPhoneNumber });
            const result = await connector.addParticipant(contact, call);
            expect(result.phoneNumber).toEqual(dummyPhoneNumber);
            expect(result.initialCallHasEnded).toBeFalsy();

            expect(result.callInfo).toEqual(new CallInfo({ isOnHold: false, 
                                                           isExternalTransfer: true, 
                                                           removeParticipantVariant: Constants.REMOVE_PARTICIPANT_VARIANT.ALWAYS }));
            expect(result.callId).not.toBeNull();
            expect(vendorSdk.messageUser).toBeCalledWith(contact.id, constants.USER_MESSAGE.CALL_STARTED, expect.anything());
        });
        
        it('Should set the isExternalTransfer flag correctly when addParticipant is called', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ id: 'dummyUser', phoneNumber: dummyPhoneNumber });
            call.callInfo.isExternalTransfer = false;
            let result = await connector.addParticipant(contact, call);
            expect(result.callInfo).toEqual(new CallInfo({ isOnHold: false, isExternalTransfer: false }));
        });
        
        it('Should throw error on adParticipant if there is already an active call', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ phoneNumber: dummyPhoneNumber });
            await connector.addParticipant(contact, call);
            try {
                await connector.addParticipant(contact, call);
            } catch(e) {
                expect(e.message).toEqual("Agent is not available for a transfer call");
            }
        });
        it('Should return a participant result on addParticipant with blind transfer', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ id: 'dummyUser', phoneNumber: dummyPhoneNumber });
            const result = await connector.addParticipant(contact, call, true);
            
            expect(result.phoneNumber).toEqual(dummyPhoneNumber);
            expect(result.initialCallHasEnded).toBeTruthy();
            expect(result.callInfo).toEqual(new CallInfo({ isOnHold: false, 
                                                           isExternalTransfer: true, 
                                                           removeParticipantVariant: Constants.REMOVE_PARTICIPANT_VARIANT.ALWAYS }));
            expect(result.callId).not.toBeNull();
            expect(vendorSdk.messageUser).toBeCalledWith(contact.id, constants.USER_MESSAGE.CALL_STARTED, expect.anything());
        });
        it('Should Transfer to Omni Flow successfully', async () => {
            global.fetch = jest.fn((resource) => {
                if (resource.includes("executeOmniFlow")) {
                    return Promise.resolve({
                        json: () => Promise.resolve({agent: "dummyUser"})
                    });
                } else {
                    return Promise.resolve({
                        json: () => Promise.resolve({voiceCallId: "someId"})
                    });
                }
            });
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ id: 'flowId', type: "Flow" });
            const result = await connector.addParticipant(contact, call);
            expect(result.initialCallHasEnded).toBeFalsy();

            expect(result.callInfo).toEqual(new CallInfo({ isOnHold: false,
                isExternalTransfer: false,
                removeParticipantVariant: Constants.REMOVE_PARTICIPANT_VARIANT.ALWAYS }));
            expect(result.callId).not.toBeNull();
            expect(vendorSdk.messageUser).toBeCalledWith("dummyUser", constants.USER_MESSAGE.CALL_STARTED, expect.anything());
        });
    });

    describe('getSignedRecordingUrl', () => {
        it('Should return a SignedRecordingUrlResult on getSignedRecordingUrl', async () => {
            vendorSdk.state.capabilities.hasSignedRecordingUrl = false;
            expect(connector.getSignedRecordingUrl('recordingUrl')).rejects.toThrow();
        });

        it('Should return a SignedRecordingUrlResult on getSignedRecordingUrl', async () => {
            const url = 'url';
            const duration = '10';
            const callId = 'callId';
            vendorSdk.state.capabilities.signedRecordingUrl = url;
            vendorSdk.state.capabilities.signedRecordingDuration = duration;
            vendorSdk.state.capabilities.hasSignedRecordingUrl = true;
            const signedRecordingUrlResult = await connector.getSignedRecordingUrl('recordingUrl', url, callId);
            expect(signedRecordingUrlResult.success).toBeTruthy();
            expect(signedRecordingUrlResult.callId).toEqual(callId);
            expect(signedRecordingUrlResult.url).toEqual(url);
            expect(signedRecordingUrlResult.duration).toEqual(10);
        });
    });

    describe('connectParticipant', () => {
        it('Should publish a participant result on connectParticipant', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ phoneNumber: dummyPhoneNumber });
            await connector.addParticipant(contact, call);
            connector.sdk.connectParticipant({removeParticipantVariant : Constants.REMOVE_PARTICIPANT_VARIANT.ALWAYS });
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.PARTICIPANT_CONNECTED, payload: new ParticipantResult({
                phoneNumber: dummyPhoneNumber,
                callInfo: new CallInfo({ isOnHold: false }),
                initialCallHasEnded: false,
                callId: expect.anything()
            })});
        });
    });

    describe('removeParticipant', () => {
        it('Should publish a participant removed result on removeParticipant', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ phoneNumber: dummyPhoneNumber });
            await connector.addParticipant(contact, call);
            const callResult = await connector.sdk.removeParticipant(Constants.PARTICIPANT_TYPE.THIRD_PARTY);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.PARTICIPANT_REMOVED, payload: callResult });
        });

        it('Should publish wrap-up started', async () => {
            jest.useFakeTimers();
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            connector.sdk.removeParticipant(Constants.PARTICIPANT_TYPE.INITIAL_CALLER);
            jest.runAllTimers();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.AFTER_CALL_WORK_STARTED, payload: { callId: call.callId }});
        });

        it('should not publish wrap-up started when call is on-going', async () => {
            jest.useFakeTimers();
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            const contact = new Contact({ phoneNumber: dummyPhoneNumber });
            await connector.addParticipant(contact, call);
            await connector.sdk.removeParticipant(Constants.PARTICIPANT_TYPE.THIRD_PARTY);
            jest.runAllTimers();
            expect(publishEvent).toBeCalledTimes(2);
        });
    });

    describe('hangup', () => {
        it('Should publish a call result on hangUp', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            connector.sdk.hangup();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.HANGUP, payload: new HangupResult({ calls: [call] })});
        });

        it('Should publish a call result on hangUp', async () => {
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber);
            const initialCall = startCallResult.call;
            const contact = new Contact({ phoneNumber: dummyPhoneNumber });
            const thirdPartyCallResult = await connector.sdk.addParticipant(contact, initialCall);
            const thirdPartyCall = connector.sdk.getCall(thirdPartyCallResult);
            const hangupCalls = [initialCall, thirdPartyCall];
            connector.sdk.hangup();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.HANGUP, payload: new HangupResult({ calls: hangupCalls })});
        });

        it('Should publish wrap-up started', async () => {
            jest.useFakeTimers();
            const startCallResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            connector.sdk.hangup();
            jest.runAllTimers();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.AFTER_CALL_WORK_STARTED, payload: { callId: call.callId }});
        });
    });

    describe('beginWrapup', () => {
        let testConnector;
        let sdk;

        beforeEach(() => {
            testConnector = new Connector(); 
            sdk = testConnector.sdk;
            sdk.state.activeCalls = {};
            sdk.state.agentAvailable = true;
            sdk.beginWrapup = jest.fn();
        });

        it('hangup should call beginWrap-up', async () => {
            const startCallResult = await sdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            testConnector.sdk.hangup();
            expect(sdk.beginWrapup).toBeCalledWith(call);
        });

        it('endcall should call beginWrap-up', async () => {
            const startCallResult = await sdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            testConnector.endCall(call);
            expect(sdk.beginWrapup).toBeCalledWith(call);
        });

        it('removeParticipant should call beginWrap-up', async () => {
            const startCallResult = await sdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            const { call } = startCallResult;
            await testConnector.sdk.removeParticipant(Constants.PARTICIPANT_TYPE.INITIAL_CALLER);
            expect(sdk.beginWrapup).toBeCalledWith(call);
        });
    });

    describe('endWrapup', () => {
        let testConnector = new Connector(); 
        let sdk = testConnector.sdk;

        afterEach(() => {
            testConnector = new Connector(); 
            sdk = testConnector.sdk;
        });

        it('Should call sdk wrapup', () => {
            sdk.endWrapup = jest.fn();
            testConnector.wrapUpCall();
            expect(sdk.endWrapup).toBeCalled();
        });

        it('Should call log with "endWrapup" during endWrapup', () => {
            sdk.log = jest.fn();
            testConnector.wrapUpCall();
            expect(sdk.log).toBeCalledWith("endWrapup");
        });
    });

    describe('setAgentStatus', () => {
        it('Should return a valid generic result on setAgentStatus', async () => {
            const result = await connector.setAgentStatus(Constants.AGENT_STATUS.ONLINE);
            expect(result.success).toBeTruthy();
        });
    });

    describe('setAgentStatus', () => {
        it('Should return a valid generic result on setAgentStatus', async () => {
            const result = await connector.setAgentStatus(Constants.AGENT_STATUS.ONLINE, new AgentStatusInfo({statusId: 'dummyStatusId', statusApiName: 'dummyStatusApiName', statusName: 'dummyStatusName'}), true);
            expect(result.success).toBeTruthy();
        });
    });

    describe('handleMessage', () => {
        it('Should handle message', () => {
            const mockPostMessage = jest.fn();
            window.BroadcastChannel = jest.fn(() => {
                return { postMessage: mockPostMessage }
            });

            const message = { message: 'message' };
            connector.handleMessage(message);
            expect(mockPostMessage).toBeCalledWith({ type: Constants.EVENT_TYPE.MESSAGE, payload: message });
        });
    });

    describe('publishMessage', () => {
        it('Should be able to publishMessage', () => {
            const message = { message: 'message' };
            vendorSdk.publishMessage(message)
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.MESSAGE, payload: message });
        });
    });

    describe('sendDigits', () => {
        it('Should NOT throw on sendDigits', async () => {
            expect(connector.sendDigits('dummydigits')).resolves.not.toThrow();
        });
    });

    describe('subsystemLoginResult', () => {
        it('Should publish succesful LOGIN_RESULT on subsystemLoginResult', () => {
            vendorSdk.showLoginPage(true);
            vendorSdk.subsystemLoginResult(true);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.LOGIN_RESULT, payload: new GenericResult({
                success: true
            })});
        });

        it('Should publish failed LOGIN_RESULT on subsystemLoginResult', () => {
            vendorSdk.showLoginPage(true);
            vendorSdk.subsystemLoginResult(false);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.LOGIN_RESULT, payload: new GenericResult({
                success: false
            })});
        });
    });

    describe('log', () => {
        it('Should call the base logger when debugEnabled flag is set', () => {
            log.mockClear();
            vendorSdk.state.capabilities.debugEnabled = true;
            vendorSdk.log("abcd");
            expect(log).toBeCalledWith({"message": "abcd"}, Constants.LOG_LEVEL.INFO);
            expect(global.console.log).toBeCalledTimes(0);
        });
        it('Should call the base logger when a json object is logged', () => {
            log.mockClear();
            vendorSdk.state.capabilities.debugEnabled = true;
            vendorSdk.log({type: "abcd"});
            expect(log).toBeCalledWith({"message": "{\"type\":\"abcd\"}"}, Constants.LOG_LEVEL.INFO);
            expect(global.console.log).toBeCalledTimes(0);
        });
        it('Should not call the base logger when debugEnabled flag is unset', () => {
            log.mockClear();
            vendorSdk.state.capabilities.debugEnabled = false;
            vendorSdk.log("abcd");
            expect(log).toBeCalledTimes(0);
            expect(global.console.log).toBeCalledTimes(1);
        });
    });

    describe('publishSetAgentStatus', () => {
        it('Should publish succesful SET_AGENT_STATUS on subsystemLoginResult', () => {
            const statusId = "statusId"; 
            vendorSdk.publishSetAgentStatus(statusId);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.SET_AGENT_STATUS, payload: new AgentStatusInfo({ statusId })});
        });
    });

    describe('publishCallBargedInEventToAgents', () => {
        
        it('Should publish succesful CALL_BARGED_IN', () => {
            const call = { callId: "callId", voiceCallId: "voiceCallId", callType: "inbound", state: "state" };
            vendorSdk.publishCallBargedInEventToAgents(call);
            expect(publishEvent).toBeCalledWith({ eventType: constants.USER_MESSAGE.CALL_BARGED_IN, payload: new SupervisedCallInfo(call)});
        });
    });

    describe('getPhoneContacts', () => {
        const onlineUser1 = new Contact ({ 
            id: 'onlineUser1',
            type: Constants.CONTACT_TYPE.AGENT,
            name : 'onlineUser1',
            availability: "AVAILABLE"
        });

        beforeEach(() => {
            vendorSdk.state.onlineUsers = [onlineUser1.id];
            vendorSdk.state.phoneContacts = [
                new Contact({
                    id: 'id1',
                    phoneNumber: "555-555-4441",
                    type: Constants.CONTACT_TYPE.PHONENUMBER,
                    name: "AgentU"
                }),
                new Contact({
                    id: 'id2',
                    type: Constants.CONTACT_TYPE.PHONEBOOK,
                    phoneNumber: "555-555-4442",
                    name: "AgentV"
                }),
                new Contact({
                    id: 'id3',
                    type: Constants.CONTACT_TYPE.PHONENUMBER,
                    name: "AgentW",
                    phoneNumber: "555-555-4443"
                })
            ]
        });
        
        it('Should return a valid result without filter', async () => {
            const result = await connector.getPhoneContacts();
            const { contacts } = result;
            expect(contacts).toStrictEqual([onlineUser1].concat(vendorSdk.state.phoneContacts));
        });

        it('Should return a valid result with contains filter', async () => {
            const filter = '123';
            const contact = new Contact({phoneNumber: filter});
            vendorSdk.state.phoneContacts = [ contact ];
            const result = await connector.getPhoneContacts({ contains: filter });
            const { contacts } = result;
            expect(contacts).toEqual([contact]);
        });

        it('Should return a valid result with type QUEUE filter', async () => {
            const filter = Constants.CONTACT_TYPE.QUEUE;
            const contact = new Contact({type: filter});
            vendorSdk.state.phoneContacts = [ contact ];
            const result = await connector.getPhoneContacts({ types: [Constants.CONTACTS_FILTER_TYPES.QUEUE]});
            const { contacts } = result;
            expect(contacts).toEqual([contact]);
        });

        it('Should return a valid result with type AGENT filter', async () => {
            const filter = Constants.CONTACT_TYPE.AGENT;
            const contact = new Contact({type: filter});
            vendorSdk.state.phoneContacts = [ contact ];
            vendorSdk.state.onlineUsers = [];
            const result = await connector.getPhoneContacts({ types: [Constants.CONTACTS_FILTER_TYPES.AGENT]});
            const { contacts } = result;
            expect(contacts).toEqual([contact]);
        });

        it('Should return a valid result with type PHONEBOOK filter', async () => {
            const filter = Constants.CONTACT_TYPE.PHONEBOOK;
            const contact = new Contact({type: filter});
            vendorSdk.state.phoneContacts = [ contact ];
            const result = await connector.getPhoneContacts({ types: [Constants.CONTACTS_FILTER_TYPES.DIRECTORY]});
            const { contacts } = result;
            expect(contacts).toEqual([contact]);
        });

        it('Should return a valid result with type PHONENUMBER filter', async () => {
            const filter = Constants.CONTACT_TYPE.PHONENUMBER;
            const contact = new Contact({type: filter});
            vendorSdk.state.phoneContacts = [ contact ];
            const result = await connector.getPhoneContacts({ types: [Constants.CONTACTS_FILTER_TYPES.CONTACT]});
            const { contacts } = result;
            expect(contacts).toEqual([contact]);
        });

        it('Should return a valid result with availability filter', async () => {
            const filter = Constants.CONTACT_TYPE.PHONENUMBER;
            const contact = new Contact({type: filter});
            vendorSdk.state.phoneContacts = [ contact ];
            const result = await connector.getPhoneContacts({ types: [Constants.CONTACTS_FILTER_TYPES.AVAILABLE] });
            const { contacts } = result;
            expect(contacts).toStrictEqual([ onlineUser1 ]);
        });

        it('Should return a valid result with limit filter', async () => {
            const result = await connector.getPhoneContacts({ limit: 1 });
            const { contacts } = result;
            expect(contacts).toStrictEqual([ onlineUser1 ]);
        });

        it('Should return a valid result with offest filter', async () => {
            const result = await connector.getPhoneContacts({ offset: 1 });
            const { contacts } = result;
            expect(contacts).toStrictEqual(vendorSdk.state.phoneContacts);
        });

        it('Should return a valid result with limit and offset filter', async () => {
            const result = await connector.getPhoneContacts({ limit: 1, offset: 1 });
            const { contacts } = result;
            expect(contacts).toStrictEqual([ vendorSdk.state.phoneContacts[0] ]);
        });
        
        it('Should return a valid result with limit, offset, contains and type filter', async () => {
            const result = await connector.getPhoneContacts({ types: [Constants.CONTACTS_FILTER_TYPES.DIRECTORY], contains: "555", limit: 20, offset: 0 });
            const { contacts } = result;
            expect(contacts).toStrictEqual([ vendorSdk.state.phoneContacts[1] ]);
        });
    });

    describe('subsystemLogout', () => {
        it('Should publish a logout result on subsystemLogout', async () => {
            vendorSdk.subsystemLogout();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.LOGOUT_RESULT, payload: new LogoutResult({
                success: true,
                loginFrameHeight: 350
            })});
        });
    });

    describe('throwError', () => {
        afterAll(() => {
            vendorSdk.throwError(false);
        });

        it('Should throw error', async () => {
            vendorSdk.throwError(true);
            expect(vendorSdk.state.throwError).toBeTruthy();
        });

        it('Should throw error', async () => {
            vendorSdk.throwError(true);
            expect(connector.sdk.executeAsync('someMethod')).rejects.toStrictEqual('demo error');
        });
    });
    
    describe('delay', () => {
        it('delay 0 should resolve executeAsync', async () => {
            expect(connector.sdk.executeAsync('someMethod')).resolves.not.toThrow();
        });

        it('delay 1 should resolve executeAsync and return the payload', async () => {
            vendorSdk.state.delayMs = 1;
            jest.useFakeTimers();
            const payload = {a: 1};
            const result = connector.sdk.executeAsync('someMethod', payload);
            jest.runOnlyPendingTimers();
            await expect(result).resolves.toEqual(payload);
        });

        it('delay 1 should resolve executeAsync', async () => {
            vendorSdk.delay(1, connector.sdk.executeAsync);
            expect(connector.sdk.executeAsync('someMethod')).resolves.not.toThrow();
        });
        afterEach(() => {
            vendorSdk.state.delayMs = 0;
        });
    });

    describe('deskphone errors when action not supported', () => {
        it('Mute should throw error', async () => {
            vendorSdk.state.capabilities.hasMute = false;
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            await expect(connector.sdk.mute()).rejects.toStrictEqual(new Error("Mute is not supported"));
        });
        it('Unmute should throw error', async () => {
            vendorSdk.state.capabilities.hasMute = false;
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            await expect(connector.sdk.unmute()).rejects.toStrictEqual(new Error("Mute is not supported"));
        });
        it('conference should throw error', async () => {
            vendorSdk.state.capabilities.hasMerge = false;
            await expect(connector.sdk.conference([])).rejects.toStrictEqual(new Error("Conference is not supported"));
        });
        it('swapCalls should throw error', async () => {
            vendorSdk.state.capabilities.hasSwap = false;
            await expect(connector.sdk.executeAsync("swapCalls")).rejects.toStrictEqual(new Error("Swap Calls is not supported"));
        });
        it('pauseRecording should throw error', async () => {
            vendorSdk.state.capabilities.hasRecord = false;
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            await expect(connector.sdk.pauseRecording()).rejects.toStrictEqual(new Error("Recording is not supported"));
        });
        it('resumeRecording should throw error', async () => {
            vendorSdk.state.capabilities.hasRecord = false;
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            await expect(connector.sdk.resumeRecording()).rejects.toStrictEqual(new Error("Recording is not supported"));
        });
    });

    describe('getCall', () => {
        it('Should error when no active calls are present', async () => {
            try {
                vendorSdk.getCall();
            } catch(e) {
                expect(e.message).toEqual("Couldn't find an active call");
            }
        });

        it('Should error when callId is not in activeCalls', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            try {
                vendorSdk.getCall({ callId: 123 });
            } catch(e) {
                expect(e.message).toEqual("Couldn't find an active call for callId 123");
            }
        });

        it('Should error when call is unknown', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            try {
                vendorSdk.getCall({ callType: 'unknown' });
            } catch(e) {
                expect(e.message).toEqual("Call is not valid. It must have callAttributes and/or callId.");
            }
        });

        it('Should return call when callId is known', async () => {
            const result = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            expect(vendorSdk.getCall({ callId: result.call.callId })).toEqual(result.call);
        });

        it('Should return call when type is HANGUP', async () => {
            const result = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            expect(vendorSdk.getCall({ callId: result.call.callId })).toEqual(result.call);
        });
    });

    describe('startInboundCall', () => {
        afterAll(() => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve({ voiceCallId: "someId" })
                })
            );
        });

        it('Should publish CALL_STARTED on succesfull call creation', async () => {
            const callResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.CALL_STARTED, payload: callResult });
        });

        it('Should not publish CALL_STARTED if Agent is not available', async () => {
            expect.hasAssertions();
            vendorSdk.state.agentAvailable = false;
            const errorMessage = `Agent is not available for a inbound call from phoneNumber - ${dummyPhoneNumber}`;
            vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes).catch((error) => {
                expect(error.message).toEqual(errorMessage);
            });
        });

        it('Should reject on failed call creation', async () => {
            const error = 'Failed call creation';
            global.fetch = jest.fn(() => 
                Promise.reject(error)
            );
            await expect(vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes)).rejects.toBe(error);
        });
        it('Should still publish CALL_STARTED when createVoiceCall API is not available', async () => {
            global.fetch = jest.fn(() => 
                Promise.resolve({
                    json: () => Promise.resolve({ success : false })
                })
            );
            const callResult = await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.CALL_STARTED, payload: callResult });
        });
    });

    describe('requestCallback', () => {
        it('Should publish a queued call back event on requestCallback', async () => {
            connector.sdk.requestCallback({ phoneNumber: '100' });
            const argument = publishEvent.mock.calls[0][0];
            expect(argument.eventType).toEqual(Constants.EVENT_TYPE.QUEUED_CALL_STARTED);
            expect(argument.payload.call.callType.toLowerCase()).toEqual(Constants.CALL_TYPE.CALLBACK.toLowerCase());
            expect(argument.payload.call.phoneNumber).toEqual('100');
        });
    });

    describe('Supervisor listen in/Barge In', () => {
        const call = { callId: "callId", voiceCallId: "voiceCallId", callType: "inbound", state: "state" };
        it('superviseCall should return the correct payload', async () => {
            const result = await connector.superviseCall(call);
            expect(result.call.callAttributes.participantType).toBe("Supervisor");
            expect(result.call.callAttributes.voiceCallId).toBe("voiceCallId");
            expect(result.call.state).toBe("connected");
        });
        it('supervisorDisconnect should return the correct payload', async () => {
            await connector.superviseCall(call);
            const result = await connector.supervisorDisconnect(call);
            expect(result.calls.length).toBe(1);
            expect(result.calls[0].state).toBe("ended");
        });
        it('supervisorBargeIn should return the correct payload', async () => {
            await connector.superviseCall(call);
            const result = await connector.supervisorBargeIn(call);
            expect(result.call.callType).toBe('inbound');
            expect(result.call.state).toBe('connected');
            expect(result.call.callAttributes.participantType).toBe('Supervisor');

        });
        it('superviseCall should fail if there is an active call', async () => {
            await vendorSdk.startInboundCall(dummyPhoneNumber, dummyCallAttributes);
            connector.superviseCall(call).catch((error) => {
                expect(error.message).toEqual('Agent is not available to supervise a call');
            });
        });
        it('connectSupervisor', async () => {
            await connector.superviseCall(call);
            await connector.sdk.connectSupervisor();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.SUPERVISOR_CALL_CONNECTED, payload: expect.anything()});
        });
        it('removeSupervisor', async () => {
            await connector.superviseCall(call);
            await connector.sdk.removeSupervisor();
            expect(publishEvent).toBeCalledWith({ eventType: Constants.EVENT_TYPE.SUPERVISOR_HANGUP, payload: expect.anything()});
        });
        it('bargeIn', async () => {
            await connector.superviseCall(call);
            const result = await connector.sdk.supervisorBargeIn(call);
            expect(result.call.callAttributes.participantType).toBe("Supervisor");
            expect(result.call.callAttributes.voiceCallId).toBe("voiceCallId");
            expect(result.call.state).toBe("connected");
        });
    });

    describe('previewCall', () => {
        it('Should publish a preview call started event on previewCall', async () => {
            connector.sdk.previewCall({ phoneNumber: '100' });
            const argument = publishEvent.mock.calls[0][0];
            expect(argument.eventType).toEqual(Constants.EVENT_TYPE.PREVIEW_CALL_STARTED);
            expect(argument.payload.call.callType.toLowerCase()).toEqual(Constants.CALL_TYPE.OUTBOUND.toLowerCase());
            expect(argument.payload.call.callAttributes.dialerType.toLowerCase()).toEqual(Constants.DIALER_TYPE.OUTBOUND_PREVIEW.toLowerCase());
            expect(argument.payload.call.phoneNumber).toEqual('100');
        });
    });

    describe('updateAudioStats', () => {
        it('Should publish a update audio stats event successfully', async () => {
            const audioStats = {stats: [{inputChannelStats: {packetsCount: 90, packetsLost: 10, jitterBufferMillis: 300, roundTripTimeMillis: 350}, outputChannelStats: {packetsCount: 90, packetsLost: 10, jitterBufferMillis: 300, roundTripTimeMillis: 350}}]};
            connector.sdk.updateAudioStats(audioStats);
            const argument = publishEvent.mock.calls[0][0];
            expect(argument.eventType).toEqual(Constants.EVENT_TYPE.UPDATE_AUDIO_STATS);
            expect(argument.payload.stats[0].inputChannelStats.packetsCount).toEqual(audioStats.stats[0].inputChannelStats.packetsCount);
            expect(argument.payload.stats[0].inputChannelStats.packetsLost).toEqual(audioStats.stats[0].inputChannelStats.packetsLost);
            expect(argument.payload.stats[0].inputChannelStats.jitterBufferMillis).toEqual(audioStats.stats[0].inputChannelStats.jitterBufferMillis);
            expect(argument.payload.stats[0].inputChannelStats.roundTripTimeMillis).toEqual(audioStats.stats[0].inputChannelStats.roundTripTimeMillis);
            expect(argument.payload.stats[0].outputChannelStats.packetsCount).toEqual(audioStats.stats[0].outputChannelStats.packetsCount);
            expect(argument.payload.stats[0].outputChannelStats.packetsLost).toEqual(audioStats.stats[0].outputChannelStats.packetsLost);
            expect(argument.payload.stats[0].outputChannelStats.jitterBufferMillis).toEqual(audioStats.stats[0].outputChannelStats.jitterBufferMillis);
            expect(argument.payload.stats[0].outputChannelStats.roundTripTimeMillis).toEqual(audioStats.stats[0].outputChannelStats.roundTripTimeMillis);
        });
        it('Should publish a update audio stats event successfully with only input channel', async () => {
            const audioStats = {stats: [{inputChannelStats: {packetsCount: 90, packetsLost: 10, jitterBufferMillis: 300, roundTripTimeMillis: 350}}]};
            connector.sdk.updateAudioStats(audioStats);
            const argument = publishEvent.mock.calls[0][0];
            expect(argument.eventType).toEqual(Constants.EVENT_TYPE.UPDATE_AUDIO_STATS);
            expect(argument.payload.stats[0].inputChannelStats.packetsCount).toEqual(audioStats.stats[0].inputChannelStats.packetsCount);
            expect(argument.payload.stats[0].inputChannelStats.packetsLost).toEqual(audioStats.stats[0].inputChannelStats.packetsLost);
            expect(argument.payload.stats[0].inputChannelStats.jitterBufferMillis).toEqual(audioStats.stats[0].inputChannelStats.jitterBufferMillis);
            expect(argument.payload.stats[0].inputChannelStats.roundTripTimeMillis).toEqual(audioStats.stats[0].inputChannelStats.roundTripTimeMillis);
        });
        it('Should publish a update audio stats event successfully with only output channel', async () => {
            const audioStats = {stats: [{outputChannelStats: {packetsCount: 90, packetsLost: 10, jitterBufferMillis: 300, roundTripTimeMillis: 350}}]};
            connector.sdk.updateAudioStats(audioStats);
            const argument = publishEvent.mock.calls[0][0];
            expect(argument.eventType).toEqual(Constants.EVENT_TYPE.UPDATE_AUDIO_STATS);
            expect(argument.payload.stats[0].outputChannelStats.packetsCount).toEqual(audioStats.stats[0].outputChannelStats.packetsCount);
            expect(argument.payload.stats[0].outputChannelStats.packetsLost).toEqual(audioStats.stats[0].outputChannelStats.packetsLost);
            expect(argument.payload.stats[0].outputChannelStats.jitterBufferMillis).toEqual(audioStats.stats[0].outputChannelStats.jitterBufferMillis);
            expect(argument.payload.stats[0].outputChannelStats.roundTripTimeMillis).toEqual(audioStats.stats[0].outputChannelStats.roundTripTimeMillis);
        });
    });
});
