source .env

autossh -L ${ES_PORT}:${ES_HOST}:${ES_PORT} ${MACHINE_IP}
