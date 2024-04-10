#!/bin/bash

#Define Variables
morpheusRoot=/workspace
tritonContainer=triton
morpheusContainer=morpheus4
modelOutputFile=cloudtrail_ae_user_models.pkl
outputFile=cloudtrail-dfp-results.csv
#ingestFile=$(basename $(ls "/morpheus/ingest/"*.csv))
#ip=$(ip addr show eth0 | awk '/inet / {print $2}' | cut -d/ -f1)

#Stop Morpheus Container
podman stop "$morpheusContainer"
podman wait "$morpheusContainer"
podman rm "$morpheusContainer"

#Start Triton Inference Container if not running
if ! podman ps --filter "name=${tritonContainer}" --filter "status=running" | grep -q ${tritonContainer}; then
        podman stop "$tritonContainer"
        podman wait "$tritonContainer"
        podman rm "$tritonContainer"
        echo -e "\n\nStarting ${tritonContainer} container"
        podman run -d --name triton2 --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable \
        -p 0.0.0.0:8000:8000 -p 0.0.0.0:8001:8001 -p 0.0.0.0:8002:8002 \
        -v /morpheus/models:/models:Z nvcr.io/nvidia/tritonserver:23.07-py3 \
                tritonserver --model-repository=/models/triton-model-repo \
                --exit-on-error=false \
                --model-control-mode=explicit
fi

#Start Morpheus Training Pipeline
echo -e "\n\nStarting ${morpheusContainer} container"
podman run -d --name ${morpheusContainer} -v /morpheus/ingest:/ingest:Z --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable nvcr.io/nvidia/morpheus/morpheus:23.07-runtime \
        nohup \
        python ${morpheusRoot}/examples/digital_fingerprinting/starter/run_cloudtrail_dfp.py \
        --columns_file=${morpheusRoot}/models/data/columns_ae_cloudtrail.txt \
        --input_glob=${morpheusRoot}/models/datasets/validation-data/dfp-cloudtrail-*-input.csv \
        --train_data_glob=${morpheusRoot}/models/datasets/training-data/dfp-*.csv \
        --models_output_filename=${morpheusRoot}/models/dfp-models/cloudtrail_ae_user_models.pkl \
        --output_file ./cloudtrail-dfp-results.csv

#Copy Output from Training Pipeline
while true; do
        if ! podman ps --filter "name=${morpheusContainer}" --filter "status=running" | grep -q ${morpheusContainer}; then
                timestamp="$(date '+%Y%m%d-%H:%M:%S')"
                podman cp ${morpheusContainer}:${morpheusRoot}/models/dfp-models/cloudtrail_ae_user_models.pkl /morpheus/models/dfp-models//cloudtrail_ae_user_models-${timestamp}.pkl
                podman cp ${morpheusContainer}:${morpheusRoot}/cloudtrail-dfp-results.csv ./cloudtrail-dfp-results-${timestamp}.csv
                break
        fi
        sleep 1
done

#Stop Morpheus Training Container
podman stop "$morpheusContainer"
podman wait "$morpheusContainer"
podman rm "$morpheusContainer"

#Start Morpheus Inference Pipeline with new model
echo -e "\n\nStarting new ${morpheusContainer} container"
podman run -d --name ${morpheusContainer} -v /morpheus/ingest:/ingest:Z --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable nvcr.io/nvidia/morpheus/morpheus:23.07-runtime \
        nohup \
        python ${morpheusRoot}/examples/digital_fingerprinting/starter/run_cloudtrail_dfp.py \
        --columns_file=${morpheusRoot}/models/data/columns_ae_cloudtrail.txt \
        --input_glob=${morpheusRoot}/models/datasets/validation-data/dfp-cloudtrail-*-input.csv \
        --pretrained_filename=${morpheusRoot}/models/dfp-models/cloudtrail_ae_user_models.pkl \
        --output_file ./cloudtrail-dfp-results.csv

#Copy Output from Morpheus Inference Pipeline
while true; do
        if ! podman ps --filter "name=${morpheusContainer}" --filter "status=running" | grep -q ${morpheusContainer}; then
                timestamp="$(date '+%Y%m%d-%H:%M:%S')"
                podman cp ${morpheusContainer}:${morpheusRoot}/cloudtrail-dfp-results.csv ./cloudtrail-dfp-results-final-${timestamp}.csv
                break
        fi
        sleep 1
done
