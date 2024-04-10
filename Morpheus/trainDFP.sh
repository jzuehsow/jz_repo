#!/bin/bash


morpheusRoot=/workspace
modelsDir=/workspace/models
triton=triton
trainer=morpheus-trainer
inference=morpheus-inference
outputModel=cloudtrail_ae_user_models.pkl
outputFile=cloudtrail-dfp-results.csv
#ingestFile=$(basename $(ls "/morpheus/ingest/"*.csv))
#ip=$(ip addr show eth0 | awk '/inet / {print $2}' | cut -d/ -f1)

if ! podman ps --filter "name=${triton}" --filter "status=running" | grep -q ${triton}; then
podman stop "$triton"
podman wait "$triton"
podman rm "$triton"
echo -e "\n\nStarting ${triton} container"
podman run -d --name triton2 --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable \
-p 0.0.0.0:8000:8000 -p 0.0.0.0:8001:8001 -p 0.0.0.0:8002:8002 \
-v /morpheus/models:/models:Z nvcr.io/nvidia/tritonserver:23.07-py3 \
tritonserver --model-repository=/models/triton-model-repo \
--exit-on-error=false \
--model-control-mode=explicit
fi

podman stop "$trainer"
podman wait "$trainer"
podman rm "$trainer"
echo -e "\n\nStarting ${trainer} container"
podman run -d --name ${trainer} -v /morpheus/ingest:/ingest:Z --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable nvcr.io/nvidia/morpheus/morpheus:23.07-runtime \
        nohup \
python ${morpheusRoot}/examples/digital_fingerprinting/starter/run_cloudtrail_dfp.py \
--columns_file=${modelsDir}/data/columns_ae_cloudtrail.txt \
--input_glob=${models}/datasets/validation-data/dfp-cloudtrail-*-input.csv \
--train_data_glob=${modelsDir}/datasets/training-data/dfp-*.csv \
--models_output_filename=${modelsDir}/dfp-models/${outputModel} \
--output_file ./${outputFile}

while true; do
        if ! podman ps --filter "name=${trainer}" --filter "status=running" | grep -q ${trainer}; then
                timestamp="$(date '+%Y%m%d-%H:%M:%S')"
                podman cp ${trainer}:${modelsDir}/dfp-models/${outputModel} ./cloudtrail_ae_user_models-${timestamp}.pkl
podman cp ${trainer}:${morpheusRoot}/${outputFile} ./cloudtrail-dfp-results-${timestamp}.csv
                break
        fi
        sleep 1
done

podman stop "$inference"
podman wait "$inference"
podman rm "$inference"
echo -e "\n\nStarting ${inference} container"
podman run -d --name ${inference} -v /morpheus/ingest:/ingest:Z --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable nvcr.io/nvidia/morpheus/morpheus:23.07-runtime \
        nohup \
        python ${morpheusRoot}/examples/digital_fingerprinting/starter/run_cloudtrail_dfp.py \
        --columns_file=${modelsDir}/data/columns_ae_cloudtrail.txt \
        --input_glob=${modelsDir}/datasets/validation-data/dfp-cloudtrail-*-input.csv \
        --pretrained_filename=/ingest/${outputModel} \
        --output_file ./${outputFile}

while true; do
        if ! podman ps --filter "name=${inference}" --filter "status=running" | grep -q ${inference}; then
                timestamp="$(date '+%Y%m%d-%H:%M:%S')"
                podman cp ${inference}:${morpheusRoot}/${outputFile} ./cloudtrail-dfp-results-final-${timestamp}.csv
                break
        fi
        sleep 1
done
