import Constants from '../common/constants'
import { Contact, publishEvent, publishError } from 'scv-connector-base';

export function initializeRemoteController(connector) {
    const requestBroadcastChannel = new BroadcastChannel('rc-request');
    requestBroadcastChannel.addEventListener('message', async (event) => {
        if (event && event.data) {
            try {
                switch (event.data.type) {
                    case Constants.LOGIN_SUBMIT: {
                        connector.sdk.subsystemLoginResult(event.data.success);
                    }
                    break;
                    case Constants.GET_SHOW_LOGIN_PAGE: {
                        const { showLoginPage } = connector.sdk.state;
                        requestBroadcastChannel.postMessage({
                            type: Constants.SHOW_LOGIN_PAGE,
                            value: showLoginPage
                        })
                    }
                    break;
                    case Constants.GET_AGENT_CONFIG: {
                        const { agentConfig } = connector.sdk.state;
                        requestBroadcastChannel.postMessage({
                            type: Constants.AGENT_CONFIG,
                            value: agentConfig,
                            from: document.referrer
                        })
                    }
                    break;
                    case Constants.GET_ACTIVE_CALLS: {
                        requestBroadcastChannel.postMessage({
                            type: Constants.ACTIVE_CALLS,
                            value: Object.values(connector.sdk.getActiveCallsObj())
                        })
                    }
                    break;
                    case Constants.THROW_ERROR: {
                        connector.sdk.throwError(event.data.value)
                    }
                    break;
                    case Constants.SET_SHOW_LOGIN_PAGE: {
                        connector.sdk.showLoginPage(event.data.value);
                    }
                    break;
                    case Constants.SET_AGENT_CONFIG: {
                        connector.sdk.updateAgentConfig({ hasMute: event.data.value.hasMute, hasRecord: event.data.value.hasRecord,
                            hasSwap: event.data.value.hasSwap, hasMerge: event.data.value.hasMerge, selectedPhone: event.data.value.selectedPhone
                         });
                    }
                    break;
                    case Constants.START_OUTBOUND_CALL: {
                        await connector.sdk.dial(new Contact({ phoneNumber: event.data.phoneNumber}), event.data.callInfo);
                    }
                    break;
                    case Constants.START_INBOUND_CALL: {
                        await connector.sdk.startInboundCall(event.data.phoneNumber, event.data.callInfo);
                    }
                    break;
                    case Constants.CONNECT_PARTICIPANT: {
                        connector.sdk.connectParticipant();
                    }
                    break;
                    case Constants.REMOVE_PARTICIPANT:
                    case Constants.END_CALL: {
                        connector.sdk.removeParticipant(event.data.participantType);
                    }
                    break;
                    case Constants.CONNECT_CALL: {
                        connector.sdk.connectCall(event.data.callInfo);
                    }
                    break;
                    case Constants.AGENT_HANGUP: {
                        connector.sdk.hangup(event.data.reason, event.data.agentErrorStatus);
                    }
                    break;
                    case Constants.SOFTPHONE_LOGOUT: {
                        await connector.sdk.subsystemLogout();
                    }
                    break;
                    case Constants.CREATE_TRANSCRIPTION: {
                        fetch('/api/createTranscription', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(event.data)
                        }).then((payload) => {
                            connector.sdk.log(`Create transcript returned with ${payload.success}`);
                        }).catch((err) => {
                            connector.sdk.log(`Create transcript failed - ${err}`);
                        });
                    }
                    break;
                    case Constants.SEND_RECORDING: {
                        fetch('/api/updateVoiceCall', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(event.data.recordingInfo)
                        }).then((payload) => {
                            connector.sdk.log(`Store recording link returned with ${payload.success}`);
                        }).catch((err) => {
                            connector.sdk.log(`Store recording link failed - ${err}`);
                        });
                    }
                    break;
                    case Constants.MESSAGE_FROM_CONNECTOR:{
                        await connector.sdk.publishMessage(event.data.message);
                    }
                    break;
                    case Constants.REQUEST_CALLBACK: {
                        connector.sdk.requestCallback(event.data.payload);
                    }
                    break;
                    case Constants.HARDPHONE_EVENT: {
                        const eventType = event.data.eventType;
                        const payload = event.data.payload;
                        let result;
                        switch (eventType) {
                            case Constants.EVENT_TYPE.MUTE_TOGGLE: {
                                if (payload.isMuted) {
                                    result = await connector.sdk.mute();
                                } else {
                                    result = await connector.sdk.unmute();
                                }
                            }
                            break;
                            case Constants.EVENT_TYPE.HOLD_TOGGLE: {
                                if (payload.isCustomerOnHold) {
                                    result = await connector.sdk.hold(payload.call);
                                } else {
                                    result = await connector.sdk.resume(payload.call);
                                }
                            }
                            break;
                            case Constants.EVENT_TYPE.RECORDING_TOGGLE: {
                                if (payload.isRecordingPaused) {
                                    result = await connector.sdk.pauseRecording(payload);
                                } else {
                                    result = await connector.sdk.resumeRecording(payload);
                                }
                            }
                            break;
                            case Constants.EVENT_TYPE.PARTICIPANT_ADDED: {
                                result = await connector.sdk.addParticipant(new Contact(payload.contact), payload.call);
                            }
                            break;
                            case Constants.EVENT_TYPE.PARTICIPANTS_SWAPPED: {
                                result = await connector.sdk.swapCalls(payload.call, payload.thirdPartyCall);
                            }
                            break;
                            case Constants.EVENT_TYPE.PARTICIPANTS_CONFERENCED: {
                                result = await connector.sdk.conference(payload);
                            }
                            break;
                        }
                        publishEvent({ eventType, payload: result });
                    }
                    break;
                }
            } catch (error) {
                const eventType = event.data.eventType;
                requestBroadcastChannel.postMessage({
                    type: Constants.ERROR,
                    error: `${error.message} (Event: ${eventType || event.data.type})`
                })
                console.error(`Error occured when published event ${eventType} from the hardphone simulator: ${error.message}`);
                if (connector.sdk.state.publishHardphoneErrors) {
                    publishError({ eventType, error });
                }
            }
    }});
}
