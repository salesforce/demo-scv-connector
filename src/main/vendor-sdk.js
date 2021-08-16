/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-unused-vars */
/* eslint-disable no-console */

/* 
 * Sample Telephony Vendor SDK 
 * @author dlouvton
 */

 /** @module vendor-sdk **/
 import { publishEvent, ActiveCallsResult, AgentConfigResult, RecordingToggleResult, ParticipantResult, MuteToggleResult,
    PhoneContactsResult, CallResult, HangupResult, HoldToggleResult, InitResult, GenericResult, SignedRecordingUrlResult,
    LogoutResult, CallInfo, PhoneCall, PhoneCallAttributes, Contact, Constants, Phone, StatsInfo, AudioStats, AudioStatsGroup } from 'scv-connector-base';

/** 
 * Class representing a Phone Call
 */
class Call extends PhoneCall {
     /**
     * Create a Call.
     * @param {string} callType - Outbound, Inbound or Transfer
     * @param {Contact} contact - Contact associated with this Call
     * @param {string} callAttributes - call attributes 
     * @param {string} callInfo - call info 
     */
    constructor(callType, contact, callAttributes, callInfo, callId) {
        const state = Constants.CALL_STATE.RINGING;
        callAttributes.initialCallHasEnded = false;
        callAttributes.state = state;
        callAttributes.isOnHold = callInfo.isOnHold;
        callId = callId || Math.random().toString(36).substring(7);
        if (callAttributes.participantType === Constants.PARTICIPANT_TYPE.INITIAL_CALLER) {
            callInfo.parentCallId = callId;
        }
        super({ callId, callType, contact, state, callAttributes, phoneNumber: contact.phoneNumber, callInfo }); 
    }

    /**
     * set callId of parent call
     */
    set parentCallId(parentCallId) {
        this.callInfo.parentCallId = parentCallId;
    }
}

/** 
 * Class representing a Softphone SDK
 */
export class Sdk {
    /**
     * Create a Softphone SDK instance.
     * @param {object} state - SDK state
     */
    constructor(state = { 
        isLoginRequired: true, 
        agentConfig: JSON.parse(localStorage.getItem('agentConfig')) || {
            hasMerge: true,
            hasMute: true,
            hasRecord: true,
            hasSwap: true,
            hasSignedRecordingUrl: false,
            signedRecordingUrl: '',
            signedRecordingDuration: null,
            hasContactSearch: true,
            phones : [ "SOFT_PHONE", "DESK_PHONE"],
            selectedPhone : {type:"SOFT_PHONE"},
            supportsMos : true
        },
        activeCalls: this.getActiveCallsObj(),
        destroyedCalls: [],
        agentStatus: "Available",
        publishHardphoneErrors: true,
        agentAvailable: false,
        phoneContacts: this.getAllPhoneContacts(50)
    }){
        this.state = {...state, 
            showLoginPage: !!JSON.parse(localStorage.getItem('showLoginPage')),
            throwError: !!JSON.parse(localStorage.getItem('throwError'))
        };
    }
    /**
     * Get a call from the active calls stored on localStorage)
     */
    getCall(call) {
        if (!call || !this.hasActiveCalls()){
            throw new Error("Couldn't find an active call", call);
        }
        if (call.callAttributes && call.callAttributes.participantType) {
            const callByParticipant = Object.values(this.state.activeCalls).filter((obj) => obj['callAttributes']['participantType'] === call.callAttributes.participantType).pop();
            if (!callByParticipant) {
                throw new Error("Couldn't find an active call for participant " + call.callAttributes.participantType);
            }
            return callByParticipant;
        }
        if (call.callId) {
            const callByCallId = this.state.activeCalls[call.callId];
            if (!callByCallId) {
                throw new Error("Couldn't find an active call for callId " + call.callId);
            }
            return callByCallId;
        } 
        throw new Error("Call is not valid. It must have callAttributes and/or callId.", call);
    }
    /**
     * Add a call to the active calls (persisted on localStorage)
     */
    addCall(call) {
        this.state.activeCalls[call.callId] = call;
        localStorage.setItem('activeCalls', JSON.stringify(this.state.activeCalls));
    }
    /**
     * Update the Main Call Info (with the initial caller)
     */
    updateInitialCallInfo(value) {
        let call = this.getCall({ callAttributes: { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER }});
        Object.assign(call.callInfo, value);
        this.addCall(call);
    }

    /*
    * This method is for demo purposes. Enables/disables the show login page for testing
    */
    showLoginPage(enable) {
        localStorage.setItem('showLoginPage', enable);
        this.state.showLoginPage = enable;
    }

    setAgentConfig(config) {
        this.state.agentConfig.selectedPhone = config.selectedPhone;
        localStorage.setItem('agentConfig', JSON.stringify(this.state.agentConfig));
        return this.executeAsync("setAgentConfig", new GenericResult({
            success: true
        }));
    }

    /*
    * Update Agent Config used only for Voice call simulator
    */
   updateAgentConfig(agentConfig) {
       this.state.agentConfig.selectedPhone = agentConfig.selectedPhone;
       this.state.agentConfig.hasMute = agentConfig.hasMute;
       this.state.agentConfig.hasRecord = agentConfig.hasRecord;
       this.state.agentConfig.hasSwap = agentConfig.hasSwap;
       this.state.agentConfig.hasMerge = agentConfig.hasMerge;
       this.state.agentConfig.hasSignedRecordingUrl = agentConfig.hasSignedRecordingUrl;
       this.state.agentConfig.signedRecordingUrl = agentConfig.signedRecordingUrl;
       this.state.agentConfig.signedRecordingDuration = agentConfig.signedRecordingDuration;
       this.state.agentConfig.hasContactSearch = agentConfig.hasContactSearch;
       this.state.agentConfig.supportsMos = agentConfig.supportsMos;
       localStorage.setItem('agentConfig', JSON.stringify(this.state.agentConfig));
    }

    /*
    * This method is for demo purposes. Enables/disables throwing sdk errors for testing
    */
   throwError(enable) {
        localStorage.setItem('throwError', enable);
        this.state.throwError = enable;
    }

    /*
    * This method simulates the vendor sending a login result
    */
    subsystemLoginResult(success) {
        this.state.agentAvailable = success;
        publishEvent({ eventType: Constants.EVENT_TYPE.LOGIN_RESULT, payload: new GenericResult({
            success: (this.state.showLoginPage && success)
        })});
    }

    /**
     * log a message
     */
    log(){
        Array.prototype.unshift.call(arguments, "[sdk]");
        Function.apply.call(console.log, console, Array.from(arguments));
    }

    /** 
        filter contacts - simulating backend search
    */
    filterContacts(contacts, filter) {
        if (!filter) {
            return contacts;
        }
        let result = contacts;
        if (filter.contains) {
            result = result.filter(obj => Object.keys(obj).some(key => obj[key] && obj[key].toLowerCase().includes(filter.contains.toLowerCase())));
        }
        if (filter.type) {
            result = result.filter(obj => Object.keys(obj).some(key => key === "type" && obj[key] === filter.type));
        }
        const startIndex = filter.offset ? filter.offset : 0; 
        const endIndex = filter.limit ? startIndex + filter.limit : result.length;
        return result.slice(startIndex, endIndex);  
    }
    /**
     * destroy one or more calls
     * @param {string} reason - reason
     */
    destroyCalls(call, reason) {
        let callsToDestroy = [];
        if (call.callAttributes && call.callAttributes.participantType === Constants.PARTICIPANT_TYPE.AGENT) {
            try {
                const customerCall = this.getCall({ callAttributes: { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER }});
                callsToDestroy.push(customerCall);
            } catch(e) {
                //noop
            }
            try {
                const thirdPartyCall = this.getCall({ callAttributes: { participantType: Constants.PARTICIPANT_TYPE.THIRD_PARTY }});
                callsToDestroy.push(thirdPartyCall);
            } catch(e) {
                //noop
            }
        } else {
            callsToDestroy.push(this.getCall(call));
        }
        callsToDestroy.forEach((callToDestroy) => {
            const state = Constants.CALL_STATE.ENDED;
            callToDestroy.state = callToDestroy.callAttributes.state = state;
            callToDestroy.reason = reason;
            this.state.destroyedCalls.push(callToDestroy);
            delete this.state.activeCalls[callToDestroy.callId];
        })
        localStorage.setItem("activeCalls", JSON.stringify(this.state.activeCalls));
        return callsToDestroy;
    }
    /**
     * destroy specified call
     * @param {string} reason - reason
     */
    destroyCall(call, reason) {
        return this.destroyCalls(call, reason).pop();
    }
    /**
     * perform sso on a container element
     * @param {object} callCenterConfig - Call Center configuration
     */
    // TODO: Create a type for SSOConfig
    init(callCenterConfig) {
        const tenantInfo = {
            scrtBaseUrl: callCenterConfig['scrtUrl'],
            orgId: callCenterConfig['organizationId'],
            callCenterName: callCenterConfig['/reqGeneralInfo/reqInternalName']
        };
        return fetch('/api/configureTenantInfo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tenantInfo)
        }).then(response => response.json())
          .then((data) => {
            if (data.success) {
                this.state.agentAvailable = !this.state.showLoginPage;
                return this.executeAsync('ssoLogin', this.state.showLoginPage ?
                new InitResult({ showLogin: true, loginFrameHeight: 350 }) :
                new InitResult({}));
            } else {
                return Promise.reject("Failed to configure tentant information");
            }
        });
    }
    /**
     * simulate logout from the telephony sub system
     */
    subsystemLogout() {
        publishEvent({ eventType: Constants.EVENT_TYPE.LOGOUT_RESULT, payload: new LogoutResult({
            success: !this.state.throwError,
            loginFrameHeight: 350
        })});
    }

    /**
     * perform logout from Omni
     */
    omniLogout() {
        return this.executeAsync("SubsystemLogout", new LogoutResult({
            success: true,
            loginFrameHeight: 350
        }));
    }
    /**
     * execute an async action and return a promise
     * @param {string} action
     * @param {object} payload
     * @return {Promise} 
     */
    executeAsync(action, payload) {
        this.log(`Executing action - ${action}`, payload);
        if (this.state.throwError) {
            return Promise.reject('demo error');
        }
        switch (action) {
            case "mute":
            case "unmute":
                if (!this.state.agentConfig.hasMute) {
                    return Promise.reject(new Error('Mute is not supported'));
                }
            break;
            case "conference":
                if (!this.state.agentConfig.hasMerge) {
                    return Promise.reject(new Error('Conference is not supported'));
                }
            break;
            case "swapCalls":
                if (!this.state.agentConfig.hasSwap) {
                    return Promise.reject(new Error('Swap Calls is not supported'));
                }
            break;
            case "pauseRecording":
            case "resumeRecording":
                if (!this.state.agentConfig.hasRecord) {
                    return Promise.reject(new Error('Recording is not supported'));
                }
            break;
            case "getSignedRecordingUrl":
                if (!this.state.agentConfig.hasSignedRecordingUrl || !this.state.agentConfig.signedRecordingUrl) {
                    return Promise.reject(new Error('Signed recording url is not supported'));
                }
            break;
        }
        return Promise.resolve(payload);
    }
    /**
     * start a call
     * @param {Contact} contact
     * @param {Object} callInfo (callInfo.isSoftphoneCall is false if dialing from a desk phone)
     */
    dial(contact, callInfo) {
        if (this.hasActiveCalls()) {
            const message = `Agent is not available for an outbound call`;
            this.log(message);
            return Promise.reject(new Error(message));
        }
        callInfo = callInfo || { isOnHold: false };
        callInfo.callStateTimestamp = new Date();
        const callAttributes = { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER };
        const call = new Call(Constants.CALL_TYPE.OUTBOUND, contact, callAttributes, new CallInfo(callInfo));
        this.addCall(call);
        const callResult = new CallResult({
            call
        });
        if (!callInfo.isSoftphoneCall) {
            publishEvent({ eventType: Constants.EVENT_TYPE.CALL_STARTED, payload: callResult });
        }
        this.state.agentAvailable = false;
        return this.executeAsync('dial', callResult);
    }
    /**
     * start a call
     * @param {string} phoneNumber - The phone number associcated with this contact
     * @param {string} callInfo 
     */
    startInboundCall(phoneNumber, callInfo) {
        callInfo = callInfo || { isOnHold: false };
        callInfo.callStateTimestamp = new Date();
        if (!this.state.agentAvailable) {
            const message = `Agent is not available for a inbound call from phoneNumber - ${phoneNumber}`;
            this.log(message);
            return Promise.reject(new Error(message));
        }
        let callAttributes = { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER };
        let contact = new Contact({ phoneNumber });
        let emitStartVoiceCall = (callId) => {
            const call = new Call(Constants.CALL_TYPE.INBOUND, contact, callAttributes, new CallInfo(callInfo), callId);
            this.addCall(call);
            const callResult = new CallResult({
                call
            });
            publishEvent({ eventType: Constants.EVENT_TYPE.CALL_STARTED, payload: callResult })
            return this.executeAsync('startInboundCall', callResult);
        };
        return fetch('/api/createVoiceCall?caller=' + phoneNumber + '&type=' + Constants.CALL_TYPE.INBOUND, {
                headers: {
                    'Strict-Transport-Security': 'max-age=31536000'
                }
            })
            .then(response => response.json())
            .then((data) => {
                if (!data.voiceCallId){
                  this.log("Could not contact Service Cloud Real Time. VoiceCall will be created by Salesforce Service Degradation Service.")
                }
                callAttributes.voiceCallId = data.voiceCallId;
                return emitStartVoiceCall(data.vendorCallKey);
            }).catch((err) => {
                return Promise.reject(err);
            });
    }

    getAllPhoneContacts(numOfContactsPerType) {
        let contacts = [];
        for (let i=1; i<=numOfContactsPerType; i++) {
            contacts = contacts.concat(new Contact ({ 
                id: 'id'+i,
                type: Constants.CONTACT_TYPE.AGENT,
                name : ["Agent Name "]+i,
                phoneNumber: "555555444"+i
            }))
        }
        for (let i=numOfContactsPerType+1; i<=numOfContactsPerType*2; i++) {
            contacts = contacts.concat(new Contact ({ 
                id: 'id'+i,
                type: Constants.CONTACT_TYPE.QUEUE,
                name : "Queue Name "+i,
                queue: "Queue"+i
            }))
        }
        for (let i=numOfContactsPerType*2+1; i<=numOfContactsPerType*3; i++) {
            contacts = contacts.concat(new Contact ({ 
                id: 'id'+i,
                type: Constants.CONTACT_TYPE.PHONEBOOK,
                name : "Phonebook Entry "+i,
                phoneNumber: "55566644"+i
            }))
        }
        for (let i=numOfContactsPerType*3+1; i<=numOfContactsPerType*4; i++) {
            contacts = contacts.concat(new Contact ({ 
                id: 'id'+i,
                type: Constants.CONTACT_TYPE.PHONENUMBER,
                name : "Phone Number "+i,
                phoneNumber: "5557774"+i
            }))
        }
        for (let i=numOfContactsPerType*4+1; i<=numOfContactsPerType*5; i++) {
            contacts = contacts.concat(new Contact ({ 
                endpointARN: 'arn'+i,
                type: Constants.CONTACT_TYPE.PHONENUMBER,
                name : ["ARN "]+i,
                phoneNumber: "5555554"+i
            }))
        }
        return contacts;
    }

    getActiveCallsObj() {
        const activeCalls = JSON.parse(localStorage.getItem('activeCalls')) || {};
        Object.keys(activeCalls).forEach(callId => {
            activeCalls[callId].contact = new Contact(activeCalls[callId].contact);
            activeCalls[callId].callInfo.callStateTimestamp = new Date(activeCalls[callId].callInfo.callStateTimestamp);
            activeCalls[callId].callInfo = new CallInfo(activeCalls[callId].callInfo);
            activeCalls[callId].callAttributes = new PhoneCallAttributes(activeCalls[callId].callAttributes);
            activeCalls[callId] = new PhoneCall(activeCalls[callId]);
        });
        return activeCalls;
    }

    hasActiveCalls() {
        return this.state.activeCalls && Object.keys(this.state.activeCalls).length > 0;
    }
    /**
     * get agent  configs, for example if mute or recording is supported, phones supported for agent
     */
    getAgentConfig() {
        return this.executeAsync("getAgentConfig", new AgentConfigResult({
            hasMute: this.state.agentConfig.hasMute,
            hasMerge: this.state.agentConfig.hasMerge,
            hasRecord: this.state.agentConfig.hasRecord,
            hasSwap:  this.state.agentConfig.hasSwap,
            hasSignedRecordingUrl: this.state.agentConfig.hasSignedRecordingUrl,
            signedRecordingUrl: this.state.agentConfig.signedRecordingUrl,
            signedRecordingDuration: this.state.agentConfig.signedRecordingDuration,
            hasContactSearch: this.state.agentConfig.hasContactSearch,
            supportsMos: this.state.agentConfig.supportsMos,
            phones: this.state.agentConfig.phones,
            selectedPhone: new Phone (this.state.agentConfig.selectedPhone)
        }));
    }

     /**
     * get all active calls
     */
    getActiveCalls() {
        const activeCalls = this.getActiveCallsObj();
        const result = Object.values(activeCalls);
        return this.executeAsync('getActiveCalls', new ActiveCallsResult({ activeCalls: result }));
    }

    /**
     * accept the  call
     * @param {PhoneCall} call
     */
    acceptCall(call){
        let callToAccept = this.getCall(call);
        const state = callToAccept.callType.toLowerCase() === Constants.CALL_TYPE.CALLBACK.toLowerCase() &&
            callToAccept.state !== Constants.CALL_STATE.CONNECTED ?
            Constants.CALL_STATE.RINGING : Constants.CALL_STATE.CONNECTED;
        callToAccept.state = state;
        callToAccept.callAttributes.state = state;
        this.log("acceptCall", callToAccept);
        this.addCall(callToAccept);
        this.state.agentAvailable = false;
        return this.executeAsync("acceptCall", new CallResult({ call: callToAccept }));
    }

    /**
     * decline call
     * @param {PhoneCall} call
     */
    declineCall(call) {
        this.log("declineCall", call);
        const destroyedCall = this.destroyCall(call, 'declined');
        this.state.agentAvailable = true;
        return this.executeAsync("declineCall", new CallResult({ call: destroyedCall }));
    }
    /**
     * end call
     * @param {PhoneCall} call
     * @param {string} agentErrorStatus
     */
    endCall(call, agentErrorStatus) {
        this.log("endCall", call, agentErrorStatus);
        const destroyedCalls = this.destroyCalls(call, Constants.HANGUP_REASON.PHONE_CALL_ENDED);
        this.state.agentAvailable = Object.keys(this.state.activeCalls).length === 0;
        this.beginWrapup(destroyedCalls[0]);
        return this.executeAsync("endCall", new HangupResult({ calls: destroyedCalls }));
    }
    /**
     * Mute
     */
    mute() {
        const isMuted = true;
        this.updateInitialCallInfo({ isMuted });
        return this.executeAsync("mute", new MuteToggleResult({ isMuted }));
    }
    /**
     * Unmute
     */
    unmute() {
        const isMuted = false;
        this.updateInitialCallInfo({ isMuted });
        return this.executeAsync("mute", new MuteToggleResult({ isMuted }));
    }
    /**
     * hold the call
     * @param {PhoneCall} call 
     */
    hold(call) {
        this.updateHoldState(call, true);
        return this.executeAsync("hold", new HoldToggleResult({
            isThirdPartyOnHold: this.isOnHold({ callAttributes: { participantType: Constants.PARTICIPANT_TYPE.THIRD_PARTY }}), 
            isCustomerOnHold: this.isOnHold({ callAttributes: { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER }}),
            calls: this.state.activeCalls
        }));
    }

    /**
     * resume the call
     * @param {PhoneCall} call 
     */
    resume(call) {
        this.updateHoldState(call, false);
        return this.executeAsync("resume", new HoldToggleResult({
            isThirdPartyOnHold: this.isOnHold({ callAttributes: { participantType: Constants.PARTICIPANT_TYPE.THIRD_PARTY }}), 
            isCustomerOnHold: this.isOnHold({ callAttributes: { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER }}),
            calls: this.state.activeCalls
        }));
    }
    /**
     * pause recording for the call
     * @param {PhoneCall} call 
     */
    pauseRecording(call) { 
        const isRecordingPaused = true;
        this.updateInitialCallInfo({ isRecordingPaused });
        return this.executeAsync("pauseRecording", new RecordingToggleResult({ isRecordingPaused }));
    }
    /**
     * resume recording for the call
     * @param {PhoneCall} call 
     */
    resumeRecording(call) { 
        const isRecordingPaused = false;
        this.updateInitialCallInfo({ isRecordingPaused });
        return this.executeAsync("pauseRecording", new RecordingToggleResult({ isRecordingPaused }));
    }
    /**
     * Return true if a call is on hold. If the call does not exist return undefined
     * @param {PhoneCall} call
     * @return true if a call is on hold
     */
    isOnHold(call) {
        try {
            return this.getCall(call).callAttributes.isOnHold;   
        } catch(e) {
            return undefined;
        }
    }
    /**
     * @param {PhoneCall} activeCall
     * @param {boolean} onHold
     */
    updateHoldState(activeCall, onHold) {
        const call = this.getCall(activeCall);
        call.callAttributes.isOnHold = onHold;
        call.callInfo.isOnHold = onHold;
        this.addCall(call);
    }
    /**
     * swap calls
     * @param {PhoneCall} call1 first call to be swapped
     * @param {PhoneCall} call2 second call to be swapped
     */
    swapCalls(call1, call2) {
        const activeCall1 = this.getCall(call1);
        const activeCall2 = this.getCall(call2);
        this.updateHoldState(call1, !activeCall1.callAttributes.isOnHold);
        this.updateHoldState(call2, !activeCall2.callAttributes.isOnHold);
        return this.executeAsync("swapCalls", new HoldToggleResult({
            isThirdPartyOnHold: this.isOnHold(call1), 
            isCustomerOnHold: this.isOnHold(call2),
            calls: this.state.activeCalls
        }));
    }
    /**
     * join calls
     * @param {PhoneCall[]} calls to be joined 
     */
    conference(calls) {
        calls.forEach((call) => {
            this.updateHoldState(call, false);
        });

        return this.executeAsync("conference", new HoldToggleResult({
            isThirdPartyOnHold: false, 
            isCustomerOnHold: false
        }));
    }
    /**
     * set agent status
     * @param {string} agentStatus agent status, Constants.AGENT_STATUS.ONLINE or Constants.AGENT_STATUS.OFFLINE
     * @param {AgentStatusInfo} agentStatusInfo object contains statusId, statusApiName and statusName
     */
    setAgentStatus(agentStatus, agentStatusInfo) {
        this.agentStatus = agentStatus;
        return this.executeAsync("setAgentStatus", new GenericResult({
            success: true
        }));
    }
    /**
     * send digits to the active call
     * @param {string} digits - digits to be sent (i.e. 123#) 
     */
    sendDigits(digits) {
        return this.executeAsync("sendDigits");
    }
    /**
     * Get Agent Phone Book Contacts
     */
    getPhoneContacts(filter) {
        var contacts = this.filterContacts(this.state.phoneContacts, filter) ;
        return this.executeAsync("getPhoneContacts", new PhoneContactsResult({
            contacts
        }));
    }
    /**
     * add participant to call through a new contact
     * @param {Contact} contact - new contact 
     * @param {PhoneCall} call - call to be transferred
     */
    addParticipant(contact, call) {
        if (this.state.activeCalls && Object.keys(this.state.activeCalls).length > 1) {
            const message = `Agent is not available for a transfer call`;
            this.log(message);
            return Promise.reject(new Error(message));
        }
        const parentCall = this.getCall(call);
        parentCall.callAttributes.isOnHold = true; //FIXME: remove callAttributes.isOnHold in core, we don't need isOnHold in two places
        parentCall.callInfo.isOnHold = true;
        const parentVoiceCallId = parentCall.callAttributes.voiceCallId;
        const newCall = new Call(Constants.CALL_TYPE.ADD_PARTICIPANT, contact, { participantType: Constants.PARTICIPANT_TYPE.THIRD_PARTY, voiceCallId: parentVoiceCallId }, new CallInfo({ isOnHold : false, callStateTimestamp: new Date() }));
        newCall.parentCallId = parentCall.callId;
        newCall.callAttributes.isOnHold = false; // same FIXME
        newCall.state = Constants.CALL_STATE.TRANSFERRING;
        this.log("addParticipant to parent voiceCall " + parentVoiceCallId, newCall);
        this.addCall(parentCall);
        this.addCall(newCall);
        return this.executeAsync("addParticipant", new ParticipantResult({
            phoneNumber: contact.phoneNumber,
            callInfo: new CallInfo({ isOnHold: false }),
            initialCallHasEnded: parentCall.callAttributes && parentCall.callAttributes.initialCallHasEnded,
            callId: newCall.callId
        }));
    }
    /**
     * connect the last added participant
     */
    connectParticipant() {
        const call = this.getCall({callAttributes: { participantType: Constants.PARTICIPANT_TYPE.THIRD_PARTY }});
        call.state = Constants.CALL_STATE.TRANSFERRED;
        this.log("connectParticipant", call);
        this.addCall(call);
        publishEvent({eventType: Constants.EVENT_TYPE.PARTICIPANT_CONNECTED, payload: new ParticipantResult({
            phoneNumber: call.contact.phoneNumber,
            callInfo: new CallInfo({ isOnHold: false }),
            initialCallHasEnded: call.callAttributes && call.callAttributes.initialCallHasEnded,
            callId: call.callId
        })});
    }
    /**
     * Simulate removing the participantType from the conversation
     * @param {PARTICIPANT_TYPE} participantType need to be removed
     */
    removeParticipant(participantType) {
        const call = this.getCall({callAttributes: { participantType: participantType }});
        const destroyedCall = this.destroyCall(call, Constants.HANGUP_REASON.PHONE_CALL_ENDED);
        this.log("removeParticipant", call);
        const payload = new CallResult({ call: destroyedCall });
        publishEvent({ eventType: Constants.EVENT_TYPE.PARTICIPANT_REMOVED, payload });
        this.state.agentAvailable = Object.keys(this.state.activeCalls).length === 0;
        this.beginWrapup(destroyedCall);
        return this.executeAsync("removeParticipant", payload);
    }
    /**
     * Simulate connecting caller
     */
    connectCall(callAttributes) {
        const call = this.getCall({callAttributes: { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER }});
        call.state = Constants.CALL_STATE.CONNECTED;
        call.callAttributes = Object.assign(call.callAttributes, callAttributes);
        call.callAttributes.state = Constants.CALL_STATE.CONNECTED;
        this.addCall(call);
        this.log("connectCall", call);
        publishEvent({ eventType: Constants.EVENT_TYPE.CALL_CONNECTED, payload: new CallResult({ call })});
    }
    /**
     * Simulate hanging up the phone from the agent (either decline or end the call from hardphone)
     */
    hangup(reason, agentErrorStatus) {
        let destroyedCalls = this.destroyCalls({callAttributes: { participantType: Constants.PARTICIPANT_TYPE.AGENT }}, reason);
        destroyedCalls.map((call) => { 
            call.callInfo.isSoftphoneCall = false;
            call.agentStatus = agentErrorStatus;
            return call;
        });
        this.state.agentAvailable = Object.keys(this.state.activeCalls).length === 0;
        publishEvent({ eventType: Constants.EVENT_TYPE.HANGUP, payload: new HangupResult({ calls: destroyedCalls })});
        this.beginWrapup(destroyedCalls[0]);
        return this.executeAsync("hangup", destroyedCalls);
    }

    /**
     * begin after call wrap-up
     * @param {PhoneCall} call - call to begin wrap-up
     * 
     * The implementation publishes AFTER_CALL_WORK_STARTED inside a setTimeout to 
     * give demo connector enough time to finish executing HANGUP/END_CALL code/events. 
     */
    beginWrapup(call) {
        setTimeout(()=> {
            if (this.state.agentAvailable) {
                publishEvent({ eventType: Constants.EVENT_TYPE.AFTER_CALL_WORK_STARTED, payload: { callId: call.callId }});
            }
        },0);
    }

    /**
     * 
     * end after call wrap-up
     */
    endWrapup() {
        this.log("endWrapup");
    }

    /**
     * send  message to Voice Call Record Home
     * @param {object} message - Message
     */
    publishMessage(message) {
        this.log("publishMessage", message);
        publishEvent({ eventType: Constants.EVENT_TYPE.MESSAGE, payload: message });
    }
    /**
     * Handle  message received from sfdc component
     * @param {object} message - Message
     */
    handleMessage(message) {
        this.log("handleMessage", message);
    }

    getSignedRecordingUrl(recordingUrl, vendorCallKey, callId) {
        return this.executeAsync("getSignedRecordingUrl", new SignedRecordingUrlResult({
            success: this.state.agentConfig.hasSignedRecordingUrl,
            url: this.state.agentConfig.signedRecordingUrl,
            duration: parseInt(this.state.agentConfig.signedRecordingDuration),
            callId
        }));
    }

    /**
     * Simulate callback
     */
    requestCallback(payload) {
        const { phoneNumber } = payload;
        const callInfo = new CallInfo({ callStateTimestamp: new Date() });
        const call = new PhoneCall({ callId: Math.random().toString(36).substring(7),
            phoneNumber,
            callInfo,
            callType: Constants.CALL_TYPE.CALLBACK.toLowerCase(),
            contact: new Contact({ phoneNumber }),
            callAttributes: { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER } });
        this.addCall(call);
        publishEvent({ eventType: Constants.EVENT_TYPE.QUEUED_CALL_STARTED, payload: new CallResult({ call })});
    }

    /**
     * Simulate update Audio Stats for MOS
     */
    updateAudioStats(audioStats) {
        this.log("updateAudioStats", audioStats);
        let statsArray = [];
        audioStats.forEach(stats => {
            let inputChannelStats;
            let outputChannelStats;
            if (stats.inputChannelStats) {
                inputChannelStats = new StatsInfo(stats.inputChannelStats);
            }
            if (stats.outputChannelStats) {
                outputChannelStats = new StatsInfo(stats.outputChannelStats);
            }
            statsArray.push(new AudioStats({inputChannelStats, outputChannelStats}));
        });
        const payload = new AudioStatsGroup({stats: statsArray});
        publishEvent({ eventType: Constants.EVENT_TYPE.UPDATE_AUDIO_STATS, payload: payload });
    }
}
