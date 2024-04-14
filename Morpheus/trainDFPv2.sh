#!/bin/bash

#morpheusRoot=/workspace
modelsDir=/workspace/models
triton=triton
trainer=morpheus-trainer
inference=morpheus-inference
outputModel=cloudtrail_ae_user_models.pkl
outputFile=cloudtrail-dfp-results.csv
#ingestFile=$(basename $(ls "/morpheus/ingest/"*.csv))
#ip=$(ip addr show eth0 | awk '/inet / {print $2}' | cut -d/ -f1)

tritonServer="tritonserver --model-repository=/models/triton-model-repo --exit-on-error=false --model-control-mode=explicit"
morpheusTrainer="python /workspace/examples/digital_fingerprinting/starter/run_cloudtrail_dfp.py \
        --columns_file=${modelsDir}/data/columns_ae_cloudtrail.txt \
        --input_glob=${models}/datasets/validation-data/dfp-cloudtrail-*-input.csv \
        --train_data_glob=${modelsDir}/datasets/training-data/dfp-*.csv \
        --models_output_filename=${modelsDir}/dfp-models/${outputModel} \
        --output_file ./${outputFile}"
morpheusInference="python /workspace/examples/digital_fingerprinting/starter/run_cloudtrail_dfp.py \
        --columns_file=${modelsDir}/data/columns_ae_cloudtrail.txt \
        --input_glob=${modelsDir}/datasets/validation-data/dfp-cloudtrail-*-input.csv \
        --pretrained_filename=/ingest/${outputModel} \
        --output_file ./${outputFile}"

container_check () {
  status=$(podman inspect "$containerName" --format '{{.State.Status}}' 2>/dev/null)
  if [[ "$status" == "running" ]]; then
    echo "\n\n${containerName} is running."
  else
    if [[ -n "$status" ]]; then
      echo "${containerName} is in the '${status}' state. Removing..."
      podman rm -f "$containerName"
    fi
  fi
}

start_container () {
  echo -e "\n\nStarting ${containerName} container"
  podman run -d --name $containerName <OPTIONS>
}

run_container () {
  container_check $containerName
  start_container $containerName
}




containerName=$triton
containerModel=$tritonServer

podman run -d --name $containerName $options $THE_FILE



podman run -d --name $triton --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable -p 0.0.0.0:8000:8000 -p 0.0.0.0:8001:8001 -p 0.0.0.0:8002:8002 -v /morpheus/models:/models:Z nvcr.io/nvidia/tritonserver:23.07-py3 \

podman run -d --name ${trainer} -v /morpheus/ingest:/ingest:Z --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable nvcr.io/nvidia/morpheus/morpheus:23.07-runtime \
  nohup $morpheusTrainer

podman run -d --name ${inference} -v /morpheus/ingest:/ingest:Z --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable nvcr.io/nvidia/morpheus/morpheus:23.07-runtime \
  nohup $morpheusInference




copy_file () {
  while true; do
  if ! podman ps --filter "name=${containerName}" --filter "status=running" | grep -q ${containerName}; then
    timestamp="$(date '+%Y%m%d-%H:%M:%S')"
    podman cp ##
    break
  fi
  sleep 1
  done
}

copy_file $

podman cp ${trainer}:${modelsDir}/dfp-models/${outputModel} ./cloudtrail_ae_user_models-${timestamp}.pkl
podman cp ${trainer}:/workspace/${outputFile} ./cloudtrail-dfp-results-${timestamp}.csv


podman cp ${inference}:/workspace/${outputFile} ./cloudtrail-dfp-results-final-${timestamp}.csv



