#!/bin/bash

tritonVersion=nvcr.io/nvidia/tritonserver:23.07-py3
morpheusVersion=nvcr.io/nvidia/morpheus/morpheus:23.07-runtime
modelsDir=/workspace/models
triton=triton
trainer=morpheus-trainer
inference=morpheus-inference
containerOpts="--device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable"

morpheusServer="python /workspace/examples/digital_fingerprinting/starter/run_cloudtrail_dfp.py \
--columns_file=${modelsDir}/data/columns_ae_cloudtrail.txt \
--input_glob=${models}/datasets/validation-data/dfp-cloudtrail-*-input.csv"
trainerPipeline="${morpheusServer} --train_data_glob=${modelsDir}/datasets/training-data/dfp-*.csv --models_output_filename=${modelsDir}/dfp-models/${outputModel} --output_file ./${outputFile}"
inferencePipeline="${morpheusServer} --pretrained_filename=/ingest/${outputModel} --output_file ./${outputFile}"
outputModel=cloudtrail_ae_user_models.pkl
outputFile=cloudtrail-dfp-results.csv

container_check () {
  status=$(podman inspect "$containerName" --format '{{.State.Status}}' 2>/dev/null)
  if [[ "$status" == "running" ]]; then
    echo "\n\n${containerName} is running."
  else
    if [[ -n "$status" ]]; then
      echo "${containerName} is in the '${status}' state. Removing..."
      podman rm -f "$containerName"
    fi
    echo -e "\n\nStarting ${containerName} container."
  fi
}

container_check $triton
podman run -d --name $triton -v /morpheus/models:/models:Z -p 0.0.0.0:8000:8000 -p 0.0.0.0:8001:8001 -p 0.0.0.0:8002:8002 $containerOpts $tritonVersion \
  tritonserver \
  --model-repository=/models/triton-model-repo \
  --exit-on-error=false \
  --model-control-mode=explicit

container_check $trainer
podman run -d --name $trainer -v /morpheus/ingest:/ingest:Z $containerOpts $morpheusVersion \
  $trainerPipeline
copy_file $trainer

container_check $inference
podman run -d --name $inference -v /morpheus/ingest:/ingest:Z $containerOpts $morpheusVersion \
  $inferencePipeline
copy_file $inference



copy_file () {
  while true; do
  if ! podman ps --filter "name=${containerName}" --filter "status=running" | grep -q ${containerName}; then
    timestamp="$(date '+%Y%m%d-%H:%M:%S')"
    podman cp ${containerName}:<PATH> <LOCAL PATH>
    break
  fi
  sleep 1
  done
}

podman cp ${trainer}:${modelsDir}/dfp-models/${outputModel} ./cloudtrail_ae_user_models-${timestamp}.pkl
podman cp ${trainer}:/workspace/${outputFile} ./cloudtrail-dfp-results-${timestamp}.csv


podman cp ${inference}:/workspace/${outputFile} ./cloudtrail-dfp-results-final-${timestamp}.csv



