/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import Constants from '../common/constants';

const requestBroadcastChannel = new BroadcastChannel('rc-request');
const showLoginPageCheckbox = document.getElementById('showLoginPageCheckbox');
const throwErrorCheckbox = document.getElementById('throwErrorCheckbox');
const hasMuteCheckbox = document.getElementById('hasMuteCheckbox');
const hasRecordCheckbox = document.getElementById('hasRecordCheckbox');
const hasSwapCheckbox = document.getElementById('hasSwapCheckbox');
const hasSignedRecordingUrlCheckbox = document.getElementById('hasSignedRecordingUrlCheckbox');
const signedRecordingUrl = document.getElementById('signed-recording-url');
const signedRecordingDuration = document.getElementById('signed-recording-duration');
const signedRecordingDetails = document.getElementById('signed-recording-url-details');
const hasMergeCheckbox = document.getElementById('hasMergeCheckbox');
const hasContactSearchCheckbox = document.getElementById('hasContactSearchCheckbox');
const supportsMosCheckbox = document.getElementById('supportsMosCheckbox');
const hasAgentAvailabilityCheckbox = document.getElementById('hasAgentAvailabilityCheckbox');
const hasBlindTransferCheckbox = document.getElementById('hasBlindTransferCheckbox');
const hasTransferToOmniFlowCheckbox = document.getElementById('hasTransferToOmniFlowCheckbox');
const hasSupervisorListenInCheckbox = document.getElementById('hasSupervisorListenInCheckbox');
const hasSupervisorBargeInCheckbox = document.getElementById('hasSupervisorBargeInCheckbox');
const hasDebugLoggingCheckbox = document.getElementById('hasDebugLoggingCheckbox');
const callIsRecordingPaused = document.getElementById('callIsRecordingPaused');
const callIsOnHold = document.getElementById('callIsOnHold');
const callIsExternalTransfer = document.getElementById("callIsExternalTransfer");
const callIsMuted = document.getElementById('callIsMuted');
const callHasAccept = document.getElementById('callHasAccept');
const callHasDecline = document.getElementById('callHasDecline');
const callHasAddParticipant = document.getElementById('callHasAddParticipant');
const callHasMute = document.getElementById('callHasMute');
const callHasHold = document.getElementById('callHasHold');
const callHasRecord = document.getElementById('callHasRecord');
const callHasSwap = document.getElementById('callHasSwap');
const callHasConference = document.getElementById('callHasConference');
const callHasExtensionToggle = document.getElementById('callHasExtensionToggle');
const phoneNumberInput = document.getElementById('phoneNumber-input');
const startOutboundCallButton = document.getElementById('start-outbound-call');
const startInboundCallButton = document.getElementById('new-inbound-call');
const connectCallButton = document.getElementById('connect-call');
const customerHangupButton = document.getElementById('customer-hangup');
const connectParticipantButton = document.getElementById('connect-participant');
const connectSupervisorButton = document.getElementById('connect-supervisor');
const acceptCallButton = document.getElementById('accept-call');
const declineCallButton = document.getElementById('decline-call');
const agentEndCallButton = document.getElementById('agent-endcall');
const customerEndCallButton = document.getElementById('customer-endcall');
const thirdPartyEndCallButton = document.getElementById('third-party-endcall');
const participantTypeButton = document.getElementById('participant-types');
const participantTypeDropdownButton = document.getElementById('participant-types-title');
const participantTypeDropdown = document.getElementById('participant-types-options');
const addParticipantButton = document.getElementById('add-participant');
const requestCallbackButton = document.getElementById('request-callback');
const pushDialerButton = document.getElementById('push-dialer');
const progressiveDialerButton = document.getElementById('progressive-dialer');
const muteButton = document.getElementById('mute');
const unmuteButton = document.getElementById('unmute');
const holdButton = document.getElementById('hold');
const resumeButton = document.getElementById('resume');
const pauseRecButton = document.getElementById('pause-rec');
const resumeRecButton = document.getElementById('resume-rec');
const swapButton = document.getElementById('swap');
const conferenceButton = document.getElementById('conference');
const removeParticipantButton = document.getElementById('remove-participant');
const removeSupervisorButton = document.getElementById('remove-supervisor');
const softphoneLogoutButton = document.getElementById('softphone-logout');
const transcriptionVendorCallKey = document.getElementById('transcription-vendor-call-key');
const transcriptionCustomerPhoneNumber = document.getElementById('transcription-customer-phone-number');
const transcriptionTextArea = document.getElementById('transcription-text-view');
const sendTranscriptionButton = document.getElementById('send-transcription');
const recordButton = document.getElementById('record-button');
const senderTypeButton = document.getElementById('sender-types');
const senderTypeDropdownButton = document.getElementById('sender-types-title');
const senderTypeDropdown = document.getElementById('sender-types-options');
const endUserDropdownButton = document.getElementById('endUserButton');
const virtualAgentDropdownButton = document.getElementById('virtualAgentButton');
const supervisorDropdownButton = document.getElementById('supervisorButton');
const sendPostCallRecordingButton = document.getElementById('send-post-call-recording');
const sendVoiceMailButton = document.getElementById('send-voice-mail');
const postCallRecordingUrl = document.getElementById('recording-link');
const sendMessageButton = document.getElementById('send-message-button');
const sendMessageTextArea = document.getElementById('send-message-text');
const receiveMessageTextArea = document.getElementById('receive-message-text');
const activeCalls1TextArea = document.getElementById('active-calls1-text');
const activeCalls2TextArea = document.getElementById('active-calls2-text');
const interactionDurationInput = document.getElementById('interaction-duration');
const holdDurationInput = document.getElementById('hold-duration');
const voiceCallIdInput =  document.getElementById('voice-id');
const activeCallHeader =  document.getElementById('active-call-header');
const activeCallsCard =  document.getElementById('active-calls-card');
const agentMissedCallButton =  document.getElementById('agent-missed-call');
const callErrorButton =  document.getElementById('call-error');
const demoTitle = document.getElementById('demo-title');
const errorSpan = document.getElementById('error-span');
const sendAudioStatsButton = document.getElementById('send-audioStats-button');
const sendAudioStatsTextArea = document.getElementById('send-audioStats-text');
const statusDropdown = document.getElementById('status-dropdown');
const hardphoneRadio = document.getElementById('hardphone');
const softphoneRadio = document.getElementById('softphone');
const allowRemovingPrimaryCallParticipantDropdown = document.getElementById('allow-removing-primary-call-participant');
const allowRemovingTransferCallParticipantDropdown = document.getElementById('allow-removing-transfer-call-participant');
const agentContactType = document.getElementById('agentContactType');
const queueContactType = document.getElementById('queueContactType');
const phoneBookContactType = document.getElementById('phoneBookContactType');
const phoneNumberContactType = document.getElementById('phoneNumberContactType');

const call = { callAttributes: { participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER }};
const thirdPartyCall = { callAttributes: { participantType: Constants.PARTICIPANT_TYPE.THIRD_PARTY }};
signedRecordingDetails.style.display = "none";

function setContactTypes() {
    requestBroadcastChannel.postMessage({
        type: Constants.SET_CONTACT_TYPES,
        contactTypes: [
            ... agentContactType.checked ? [Constants.CONTACT_TYPE.AGENT] : [],
            ... queueContactType.checked ? [Constants.CONTACT_TYPE.QUEUE] : [],
            ... phoneBookContactType.checked ? [Constants.CONTACT_TYPE.PHONEBOOK] : [],
            ... phoneNumberContactType.checked ? [Constants.CONTACT_TYPE.PHONENUMBER] : []
        ]
    })
}

function getRemovingParticipantSettings(callType) {
    if (callType === Constants.CALL_TYPE.ADD_PARTICIPANT) {
        return allowRemovingTransferCallParticipantDropdown.value;
    } 
    return allowRemovingPrimaryCallParticipantDropdown.value;
}
function getCallInfo(callType) {
    return {
        isSoftphoneCall: softphoneRadio.checked,
        isOnHold: callIsOnHold.checked,
        isMuted: callIsMuted.checked,
        isRecordingPaused: callIsRecordingPaused.checked,
        acceptEnabled: callHasAccept.checked,
        declineEnabled: callHasDecline.checked,
        muteEnabled: callHasMute.checked,
        swapEnabled: callHasSwap.checked,
        conferenceEnabled: callHasConference.checked,
        extensionEnabled: callHasExtensionToggle.checked,
        holdEnabled: callHasHold.checked,
        recordEnabled: callHasRecord.checked,
        addCallerEnabled: callHasAddParticipant.checked,
        isExternalTransfer: callIsExternalTransfer.checked,
        removeParticipantVariant: getRemovingParticipantSettings(callType)
    }
}

function toggleHardphoneElements() {
    [startOutboundCallButton, acceptCallButton, declineCallButton, callHasAccept, callHasDecline].forEach(elem => {
        elem.disabled = softphoneRadio.checked;
        elem.title = softphoneRadio.checked ? "This is only enabled when hardphone is selected" :"";
    })
}

function toggleSignedRecordingUrlElements() {
    signedRecordingDetails.style.display = hasSignedRecordingUrlCheckbox.checked ? 'block' : 'none';
}

function updateActiveCalls() {
    requestBroadcastChannel.postMessage({
        type: Constants.GET_ACTIVE_CALLS
    });
}
let senderType = Constants.SENDER_TYPE.END_USER;
let endCallParticipantType = Constants.PARTICIPANT_TYPE.AGENT;
let phoneNumber;

requestBroadcastChannel.addEventListener('message', (event) => {
    if (event && event.data) {
        switch (event.data.type) {
            case Constants.SHOW_LOGIN_PAGE: {
                showLoginPageCheckbox.checked = event.data.value;
            }
            break;
            case Constants.AGENT_CONFIG: {
                demoTitle.innerText = `Connected to ${event.data.from}`;
                if(event.data.value.selectedPhone.type  === 'DESK_PHONE') {
                    hardphoneRadio.checked = true;
                    softphoneRadio.checked = false;
                } else {
                    softphoneRadio.checked = true;
                    hardphoneRadio.checked = false;
                }
                toggleHardphoneElements();
                populateStatusesDropdown(event.data.userPresenceStatuses);
            }
            break;
            case Constants.CAPABILITIES: {
                demoTitle.innerText = `Connected to ${event.data.from}`;
                hasMuteCheckbox.checked = event.data.value.hasMute;
                hasRecordCheckbox.checked = event.data.value.hasRecord;
                hasSwapCheckbox.checked = event.data.value.hasSwap;
                hasMergeCheckbox.checked = event.data.value.hasMerge;
                hasContactSearchCheckbox.checked = event.data.value.hasContactSearch;
                supportsMosCheckbox.checked = event.data.value.supportsMos;
                hasAgentAvailabilityCheckbox.checked = event.data.value.hasAgentAvailability;
                hasSupervisorListenInCheckbox.checked = event.data.value.hasSupervisorListenIn;
                hasSupervisorBargeInCheckbox.checked = event.data.value.hasSupervisorBargeIn;
                hasBlindTransferCheckbox.checked = event.data.value.hasBlindTransfer;
                hasDebugLoggingCheckbox.checked = event.data.value.debugEnabled;
                hasSignedRecordingUrlCheckbox.checked = event.data.value.hasSignedRecordingUrl;
                hasTransferToOmniFlowCheckbox.checked = event.data.value.hasTransferToOmniFlow;
                signedRecordingUrl.value = event.data.value.signedRecordingUrl ? event.data.value.signedRecordingUrl : '';
                signedRecordingDuration.value = event.data.value.signedRecordingDuration ? event.data.value.signedRecordingDuration : '';
                toggleSignedRecordingUrlElements();
            }
            break;
            case Constants.MESSAGE: {
                 receiveMessageTextArea.value =  JSON.stringify(event.data.payload);
            }
            break;
            case Constants.ACTIVE_CALLS: {
                 prettyPrintCalls(event.data.value);
            }
            break;
            case Constants.ERROR: {
                 showError(event.data.error);
            }
            break;
        }
    }
});

function populateStatusesDropdown(userPresenceStatuses){
    statusDropdown.length = 0;
    let defaultOption = document.createElement('option');
    defaultOption.text = 'Choose Presence';
    defaultOption.value = '';
    defaultOption.disabled = true;
    statusDropdown.add(defaultOption);
    statusDropdown.selectedIndex = 0;
    const data = JSON.parse(userPresenceStatuses);
    let option;
    for (const [key, value] of Object.entries(data)) {
        option = document.createElement('option');
        option.text = value.statusName;
        option.value = key;
        statusDropdown.add(option);
    }
}

function showError(error) {
    errorSpan.innerHTML = error ? `<span style="color:red;">&nbsp;&nbsp;&nbsp;${error}&nbsp;</span>` : "";
}

function prettyPrintCalls(activeCalls) {
    activeCallsCard.style.display = "none";
    activeCalls1TextArea.style.display = "none";
    activeCalls2TextArea.style.display = "none";
    activeCallHeader.style.display = "none";
    addParticipantButton.disabled = true;
    connectSupervisorButton.style.display = "none";
    removeSupervisorButton.style.display = "none";
    if (Array.isArray(activeCalls) && activeCalls.length > 0){
        if (hasSupervisorListenInCheckbox.checked) {
            connectSupervisorButton.style.display = "block";
            removeSupervisorButton.style.display = "block";
        }
        activeCallsCard.style.display = "block";
        activeCallHeader.style.display = "block";
        addParticipantButton.disabled = false;
        acceptCallButton.disabled = softphoneRadio.checked;
        declineCallButton.disabled = softphoneRadio.checked;
        activeCallHeader.innerHTML = `Active Calls&nbsp;&nbsp;&nbsp;<span style="color:green;border-style:groove;}">&nbsp;${activeCalls[0].state}&nbsp;</span>`;
        activeCalls.forEach((call,index) => {
            const elem = index === 0 ? activeCalls1TextArea : activeCalls2TextArea;
            elem.style.display = "block";
            elem.value = `Call ${call.state} to ${call.callAttributes.participantType}:\n`;
            Object.keys(call).forEach(key => {
                elem.value += `${key}: ${JSON.stringify(call[key], null, 2)}\n`;
            })
        })
        const mosElem = sendAudioStatsTextArea;
        let audioStats = JSON.parse(mosElem.value);
        audioStats.callId = activeCalls[0].callId;
        mosElem.value = JSON.stringify(audioStats, undefined, 4);
    }
}
activeCallsCard.style.display = "none";
updateActiveCalls();
setInterval(updateActiveCalls, 3000);

requestBroadcastChannel.postMessage({
    type: Constants.GET_SHOW_LOGIN_PAGE
});

requestBroadcastChannel.postMessage({
    type: Constants.GET_AGENT_CONFIG
});

requestBroadcastChannel.postMessage({
    type: Constants.GET_CAPABILITIES
});

window.addEventListener('mouseup', function(){
    showError("");
    setTimeout(updateActiveCalls, 200);
});
showLoginPageCheckbox.addEventListener('change', showLoginChanged);
throwErrorCheckbox.addEventListener('change', throwErrorChanged);
hasMuteCheckbox.addEventListener('change', setCapabilities);
hasRecordCheckbox.addEventListener('change', setCapabilities);
hasMergeCheckbox.addEventListener('change', setCapabilities);
hasTransferToOmniFlowCheckbox.addEventListener('change', setCapabilities);
hasContactSearchCheckbox.addEventListener('change', setCapabilities);
supportsMosCheckbox.addEventListener('change', setCapabilities);
hasAgentAvailabilityCheckbox.addEventListener('change', setCapabilities);
hasSupervisorListenInCheckbox.addEventListener('change', setCapabilities);
hasSupervisorBargeInCheckbox.addEventListener('change', setCapabilities);
hasDebugLoggingCheckbox.addEventListener('change', setCapabilities);
hasBlindTransferCheckbox.addEventListener('change', setCapabilities);
hasSwapCheckbox.addEventListener('change', setCapabilities);
hasSignedRecordingUrlCheckbox.addEventListener('change', setCapabilities);
signedRecordingUrl.addEventListener('change', setCapabilities);
signedRecordingDuration.addEventListener('change', setCapabilities);
hardphoneRadio.addEventListener('change', setAgentConfig);
softphoneRadio.addEventListener('change', setAgentConfig);
startOutboundCallButton.addEventListener('click', startOutboundCall);
startInboundCallButton.addEventListener('click', startInboundCall);
connectCallButton.addEventListener('click', connectCall);
customerHangupButton.addEventListener('click', customerHangup);
acceptCallButton.addEventListener('click', acceptCall);
declineCallButton.addEventListener('click', declineCall);
agentEndCallButton.addEventListener('click', agentEndCallClicked);
customerEndCallButton.addEventListener('click', customerEndCallClicked);
thirdPartyEndCallButton.addEventListener('click', thirdPartyEndCallClicked);
participantTypeDropdownButton.addEventListener('click', endCall);
participantTypeButton.addEventListener('click', showParticipantTypeOptions);
softphoneLogoutButton.addEventListener('click', softphoneLogout);
recordButton.addEventListener('click', recordClicked);
endUserDropdownButton.addEventListener('click', endUserClicked);
supervisorDropdownButton.addEventListener('click', supervisorClicked);
virtualAgentDropdownButton.addEventListener('click', virtualAgentClicked);
transcriptionTextArea.addEventListener('input', onTranscriptionChanged);
sendTranscriptionButton.addEventListener('click', sendTranscription);
sendPostCallRecordingButton.addEventListener('click', sendPostCallRecording);
sendVoiceMailButton.addEventListener('click', sendVoiceMail);
sendMessageButton.addEventListener('click', sendMessage);
connectParticipantButton.addEventListener('click', connectParticipant);
removeParticipantButton.addEventListener('click', removeParticipant);
connectSupervisorButton.addEventListener('click', connectSupervisor);
removeSupervisorButton.addEventListener('click', removeSupervisor);
senderTypeButton.addEventListener('click', showSenderTypeOptions);
addParticipantButton.addEventListener('click', addParticipant);
requestCallbackButton.addEventListener('click', requestCallback);
pushDialerButton.addEventListener('click', pushDialer);
progressiveDialerButton.addEventListener('click', progressiveDialer);
muteButton.addEventListener('click', mute);
unmuteButton.addEventListener('click', unmute);
holdButton.addEventListener('click', hold);
resumeButton.addEventListener('click', resume);
resumeRecButton.addEventListener('click', resumeRec);
pauseRecButton.addEventListener('click', pauseRec);
swapButton.addEventListener('click', swap);
conferenceButton.addEventListener('click', conference);
agentMissedCallButton.addEventListener('click', agentMissedCall);
callErrorButton.addEventListener('click', callError);
sendAudioStatsButton.addEventListener('click', sendAudioStats);
statusDropdown.addEventListener('change', setAgentStatus);
allowRemovingTransferCallParticipantDropdown.addEventListener('change', setRemoveTransferParticipantVariant);
agentContactType.addEventListener('change', setContactTypes);
queueContactType.addEventListener('change', setContactTypes);
phoneBookContactType.addEventListener('change', setContactTypes);
phoneNumberContactType.addEventListener('change', setContactTypes);

function showLoginChanged() {
    requestBroadcastChannel.postMessage({
        type: Constants.SET_SHOW_LOGIN_PAGE,
        value: showLoginPageCheckbox.checked
    });
}

function throwErrorChanged() {
    requestBroadcastChannel.postMessage({
        type: Constants.THROW_ERROR,
        value: throwErrorCheckbox.checked
    });
}

function setAgentConfig() {
    toggleHardphoneElements();
    startOutboundCallButton.disabled = !hardphoneRadio.checked;
    requestBroadcastChannel.postMessage({
        type: Constants.SET_AGENT_CONFIG,
        value: {
            selectedPhone: hardphoneRadio.checked? {type: "DESK_PHONE", number:"101 101 10001"}: {type: "SOFT_PHONE"}}
    });
}

function setCapabilities() {
    toggleSignedRecordingUrlElements();
    requestBroadcastChannel.postMessage({
        type: Constants.SET_CAPABILITIES,
        value: {
            hasMute: hasMuteCheckbox.checked,
            hasRecord: hasRecordCheckbox.checked,
            hasSwap: hasSwapCheckbox.checked,
            hasMerge: hasMergeCheckbox.checked,
            hasContactSearch: hasContactSearchCheckbox.checked,
            supportsMos: supportsMosCheckbox.checked,
            hasAgentAvailability: hasAgentAvailabilityCheckbox.checked,
            hasSignedRecordingUrl: hasSignedRecordingUrlCheckbox.checked,
            hasSupervisorListenIn: hasSupervisorListenInCheckbox.checked,
            hasBlindTransfer: hasBlindTransferCheckbox.checked,
            hasSupervisorBargeIn: hasSupervisorBargeInCheckbox.checked,
            debugEnabled: hasDebugLoggingCheckbox.checked,
            signedRecordingUrl: signedRecordingUrl.value,
            signedRecordingDuration: signedRecordingDuration.value,
            hasTransferToOmniFlow: hasTransferToOmniFlowCheckbox.checked}
    });
}

function startOutboundCall() {
    phoneNumber = phoneNumberInput.value;
    requestBroadcastChannel.postMessage({
        type: Constants.START_OUTBOUND_CALL,
        phoneNumber,
        callInfo: getCallInfo(Constants.CALL_TYPE.OUTBOUND)
    });
}

function connectParticipant() {
    requestBroadcastChannel.postMessage({
        type: Constants.CONNECT_PARTICIPANT,
        callInfo: getCallInfo(Constants.CALL_TYPE.ADD_PARTICIPANT)
    });
}

function removeParticipant() {
    requestBroadcastChannel.postMessage({
        type: Constants.REMOVE_PARTICIPANT,
        participantType: Constants.PARTICIPANT_TYPE.THIRD_PARTY
    });
}

function connectSupervisor() {
    requestBroadcastChannel.postMessage({
        type: Constants.CONNECT_SUPERVISOR
    });
}

function removeSupervisor() {
    requestBroadcastChannel.postMessage({
        type: Constants.REMOVE_SUPERVISOR
    });
}
function setAgentStatus() {
    if (statusDropdown.value) {
        requestBroadcastChannel.postMessage({
            type: Constants.SET_AGENT_STATUS,
            statusId: statusDropdown.value
        });
    }
}

function setRemoveTransferParticipantVariant() {
    requestBroadcastChannel.postMessage({
        type: Constants.REMOVE_PARTICIPANT_VARIANT,
        variant: allowRemovingTransferCallParticipantDropdown.value
    });
}

function connectCall() {
    requestBroadcastChannel.postMessage({
        type: Constants.CONNECT_CALL,
        callInfo: getCallInfo(Constants.CALL_TYPE.OUTBOUND)
    });
}

function customerHangup() {
    requestBroadcastChannel.postMessage({
        type: Constants.REMOVE_PARTICIPANT, 
        participantType: Constants.PARTICIPANT_TYPE.INITIAL_CALLER
    });
}

function acceptCall() {
    requestBroadcastChannel.postMessage({
        type: Constants.CONNECT_CALL, 
        callInfo: getCallInfo(Constants.CALL_TYPE.INBOUND)
    });
}

function declineCall() {
    requestBroadcastChannel.postMessage({
        type: Constants.AGENT_HANGUP, 
        reason: Constants.HANGUP_REASON.PHONE_CALL_ERROR,
        agentErrorStatus: Constants.AGENT_ERROR_STATUS.DECLINED_BY_AGENT

    });
}

function agentMissedCall() {
    requestBroadcastChannel.postMessage({
        type: Constants.AGENT_HANGUP, 
        reason: Constants.HANGUP_REASON.PHONE_CALL_ERROR,
        agentErrorStatus: Constants.AGENT_ERROR_STATUS.MISSED_BY_AGENT

    });
}

function callError() {
    requestBroadcastChannel.postMessage({
        type: Constants.AGENT_HANGUP, 
        reason: Constants.HANGUP_REASON.PHONE_CALL_ERROR,
        agentErrorStatus: "AnyVendorError"
    });
}


function startInboundCall() {
    phoneNumber = phoneNumberInput.value;
    requestBroadcastChannel.postMessage({
        type: Constants.START_INBOUND_CALL,
        phoneNumber,
        callInfo: getCallInfo(Constants.CALL_TYPE.INBOUND)
    });
}

function addParticipant() {
    phoneNumber = phoneNumberInput.value;
    const contact = { phoneNumber, type: 'PhoneNumber' };
    requestBroadcastChannel.postMessage({
        type: Constants.HARDPHONE_EVENT,
        eventType: Constants.EVENT_TYPE.PARTICIPANT_ADDED,
        payload: { call: {...call, callInfo: getCallInfo()} , contact }
    });
}

function requestCallback() {
    phoneNumber = phoneNumberInput.value;
    requestBroadcastChannel.postMessage({
        type: Constants.REQUEST_CALLBACK,
        payload: { phoneNumber }
    });
}

function pushDialer() {
    phoneNumber = phoneNumberInput.value;
    requestBroadcastChannel.postMessage({
        type: Constants.PUSH_DIALER,
        payload: { phoneNumber }
    });
}

function progressiveDialer() {
    phoneNumber = phoneNumberInput.value;
    requestBroadcastChannel.postMessage({
        type: Constants.PROGRESSIVE_DIALER,
        phoneNumber,
        callInfo: getCallInfo(Constants.CALL_TYPE.OUTBOUND)
    });
}

function mute() {
    requestBroadcastChannel.postMessage({
        type: Constants.HARDPHONE_EVENT,
        eventType: Constants.EVENT_TYPE.MUTE_TOGGLE,
        payload: { isMuted: true }
    });
}

function unmute() {
    requestBroadcastChannel.postMessage({
        type: Constants.HARDPHONE_EVENT,
        eventType: Constants.EVENT_TYPE.MUTE_TOGGLE,
        payload: { isMuted: false }
    });
}

function hold() {
    requestBroadcastChannel.postMessage({
        type: Constants.HARDPHONE_EVENT,
        eventType: Constants.EVENT_TYPE.HOLD_TOGGLE,
        payload: { call, isCustomerOnHold: true }
    });
}

function resume() {
    requestBroadcastChannel.postMessage({
        type: Constants.HARDPHONE_EVENT,
        eventType: Constants.EVENT_TYPE.HOLD_TOGGLE,
        payload: { call, isCustomerOnHold: false }
    });
}

function resumeRec() {
    requestBroadcastChannel.postMessage({
        type: Constants.HARDPHONE_EVENT,
        eventType: Constants.EVENT_TYPE.RECORDING_TOGGLE,
        payload: { call, isRecordingPaused: false }
    });
}

function pauseRec() {
    requestBroadcastChannel.postMessage({
        type: Constants.HARDPHONE_EVENT,
        eventType: Constants.EVENT_TYPE.RECORDING_TOGGLE,
        payload: { call, isRecordingPaused: true }
    });
}

function swap() {
    requestBroadcastChannel.postMessage({
        type: Constants.HARDPHONE_EVENT,
        eventType: Constants.EVENT_TYPE.PARTICIPANTS_SWAPPED,
        payload: { call, thirdPartyCall }
    });
}

function conference() {
    requestBroadcastChannel.postMessage({
        type: Constants.HARDPHONE_EVENT,
        eventType: Constants.EVENT_TYPE.PARTICIPANTS_CONFERENCED,
        payload: [ call, thirdPartyCall ]
    });
}

function softphoneLogout() {
    requestBroadcastChannel.postMessage({
        type: Constants.SOFTPHONE_LOGOUT
    });
}

function recordClicked() {
    transcriptionTextArea.value = '';

    const SpeechRecognition = SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition ) {
        recordButton.disabled = true;
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        transcriptionTextArea.value = transcript;
      }
      
      recognition.onspeechend = () => {
        recordButton.disabled = false;
      }
      
      recognition.onnomatch = () => {
        recordButton.disabled = false;
      }
      
      recognition.onerror = () => {
        recordButton.disabled = false;
      }
      recognition.start();
      recordButton.disabled = true;
}

function onTranscriptionChanged() {
    recordButton.disabled = transcriptionTextArea.value;
}

function showSenderTypeOptions() {
    senderTypeDropdown.classList.toggle('slds-is-open');
}

function endUserClicked() {
    senderType = Constants.SENDER_TYPE.END_USER;
    senderTypeDropdownButton.innerText = 'Customer';
    senderTypeDropdown.classList.toggle('slds-is-open');
}

function supervisorClicked() {
    senderType = Constants.SENDER_TYPE.SUPERVISOR;
    senderTypeDropdownButton.innerText = 'Supervisor';
    senderTypeDropdown.classList.toggle('slds-is-open');
}

function virtualAgentClicked() {
    senderType = Constants.SENDER_TYPE.VIRTUAL_AGENT;
    senderTypeDropdownButton.innerText = 'Unknown agent';
    senderTypeDropdown.classList.toggle('slds-is-open');
}

function showParticipantTypeOptions() {
    participantTypeDropdown.classList.toggle('slds-is-open');
}

function agentEndCallClicked() {
    endCallParticipantType = Constants.PARTICIPANT_TYPE.AGENT;
    participantTypeDropdownButton.innerText = 'End Call';
    participantTypeDropdown.classList.toggle('slds-is-open');
}

function customerEndCallClicked() {
    endCallParticipantType = Constants.PARTICIPANT_TYPE.INITIAL_CALLER;
    participantTypeDropdownButton.innerText = 'End Customer Leg';
    participantTypeDropdown.classList.toggle('slds-is-open');
}

function thirdPartyEndCallClicked() {
    endCallParticipantType = Constants.PARTICIPANT_TYPE.THIRD_PARTY;
    participantTypeDropdownButton.innerText = 'End Third-Party Leg';
    participantTypeDropdown.classList.toggle('slds-is-open');
}

function endCall() {
    if (endCallParticipantType===Constants.PARTICIPANT_TYPE.AGENT) {
        requestBroadcastChannel.postMessage({
            type: Constants.AGENT_HANGUP, 
            reason: Constants.HANGUP_REASON.PHONE_CALL_ENDED
        });
    } else {
        requestBroadcastChannel.postMessage({
            type: Constants.END_CALL, 
            participantType: endCallParticipantType
        });
    }
}

function sendTranscription() {
    const content = transcriptionTextArea.value;
    const vendorCallKey = transcriptionVendorCallKey.value;
    phoneNumber = transcriptionCustomerPhoneNumber.value ? transcriptionCustomerPhoneNumber.value : phoneNumber;
    requestBroadcastChannel.postMessage({
        type: Constants.CREATE_TRANSCRIPTION,
        content,
        messageId: Math.random().toString(36).substring(10),
        senderType,
        phoneNumber,
        vendorCallKey
    });
    transcriptionTextArea.value = '';
    recordButton.disabled = false;
}

function sendPostCallRecording() {
    const agentInteractionDuration = interactionDurationInput.value;
    const totalHoldDuration = holdDurationInput.value;
    const recordingUrl = postCallRecordingUrl.value;
    const voiceCallId = voiceCallIdInput.value;
    if(recordingUrl &&  totalHoldDuration && agentInteractionDuration) {
         const recordingInfo = {agentInteractionDuration:parseInt(agentInteractionDuration), totalHoldDuration:parseInt(totalHoldDuration), recordingUrl, voiceCallId};
         requestBroadcastChannel.postMessage({
                type: Constants.SEND_RECORDING,
                recordingInfo });
         postCallRecordingUrl.value = '';
         interactionDurationInput.value = '';
         holdDurationInput.value = '';
         voiceCallIdInput.value = '';
    }
}

function sendVoiceMail(){
    const dialedPhoneNumber = document.getElementById("voicemail-dialedphone").value;
    const transcripts = document.getElementById("voicemail-transcripts").value;
    const recordingUrl = document.getElementById("voicemail-recording").value;
    const caller =  document.getElementById("voicemail-caller").value;
    const recordingLength = document.getElementById("voicemail-length").value;
    const voiceMailDetails = { dialedPhoneNumber, transcripts, recordingUrl, caller, recordingLength };
    if(dialedPhoneNumber &&  transcripts && recordingUrl) {
         requestBroadcastChannel.postMessage({
                type: Constants.SEND_VOICE_MAIL,
                voiceMailDetails
         });
         document.getElementById("voicemail-dialedphone").value = '';
         document.getElementById("voicemail-transcripts").value = '';
         document.getElementById("voicemail-recording").value = '';
         document.getElementById("voicemail-caller").value = '';
         document.getElementById("voicemail-length").value = '';
    }
}

function sendMessage() {
    const message = sendMessageTextArea.value;
    requestBroadcastChannel.postMessage({
        type: Constants.MESSAGE_FROM_CONNECTOR,
        message : { message }
    });
}

function sendAudioStats() {
    const audioStats = JSON.parse(sendAudioStatsTextArea.value);
    requestBroadcastChannel.postMessage({
        type: Constants.SEND_AUDIO_STATS,
        audioStats : audioStats
    });
}
