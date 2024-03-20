#!/bin/bash

#Define variables
MORPHEUS_ROOT=/workspace
ingestFile=$(basename $(ls "/morpheus/ingest/"*.csv))
ip=$(ip addr show eth0 | awk '/inet / {print $2}' | cut -d/ -f1)
NOW="$(date '+%Y%m%d-%H:%M:%S')"

#Stop and remove all containers
for name in $(podman ps --format "{{.Names}}"); do
        echo -e "\nStopping container: $name"
        podman stop "$name"
        podman wait "$name"
done
for name in $(podman ps -a --format "{{.Names}}"); do
        echo -e "\nRemoving container: $name"
        podman rm "$name"
done

#Start triton container
echo -e "\n\nStarting triton container with log-parsing-onnx model"
podman run -d --name triton --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable \
        -p 0.0.0.0:8000:8000 -p 0.0.0.0:8001:8001 -p 0.0.0.0:8002:8002 \
        -v /morpheus/models:/models:Z nvcr.io/nvidia/tritonserver:23.07-py3 \
                tritonserver --model-repository=/models/triton-model-repo \
                --exit-on-error=false \
                --model-control-mode=explicit \
                --load-model log-parsing-onnx

#Start morpheus-logs container
echo -e "\n\nStarting morpheus-logs container with $ingestFile"
podman run -d --name morpheus-logs -v /morpheus/ingest:/ingest:Z --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable nvcr.io/nvidia/morpheus/morpheus:23.07-runtime \
        python ${MORPHEUS_ROOT}/examples/log_parsing/run.py \
        --num_threads 1 \
        --input_file /ingest/$ingestFile \
        --output_file ./log-parsing-output.jsonlines \
        --model_vocab_hash_file=${MORPHEUS_ROOT}/models/data/bert-base-cased-hash.txt \
        --model_vocab_file=${MORPHEUS_ROOT}/models/training-tuning-scripts/sid-models/resources/bert-base-cased-vocab.txt \
        --model_seq_length=256 \
        --model_name log-parsing-onnx \
        --model_config_file=${MORPHEUS_ROOT}/models/log-parsing-models/log-parsing-config-20220418.json \
        --server_url $ip:8001

#Copy json output from morpheus-logs container to host
while true; do
        if ! podman ps --filter "name=morpheus-logs" --filter "status=running" | grep -q 'morpheus-logs'; then
                podman cp morpheus-logs:/workspace/log-parsing-output.jsonlines ./log-parsing-output-${NOW}.jsonlines
                break
        fi
        sleep 1
done