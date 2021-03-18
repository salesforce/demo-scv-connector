import { Constants } from 'scv-connector-base'
export default {
    ...Constants,
    CALL_INBOUND_PARAMS_KEY: { 
        type : "Inbound", 
        phoneNumber:  "555-555-5555"
    },
    DIGITS_KEY: "1234",
    AGENT_STATUS: {agentStatus: 'Available'},
    CALL_CENTER_CONFIG: { config: 'sso_config' },
    CONTAINER_DIV_KEY: 'CONTAINER_DIV',
    GENERIC_ERROR_KEY: 'GENERIC_ERROR'
};