#!/bin/bash

MORPHEUS_ROOT=/workspace

podman rm morpheus-logs

podman run -d --name morpheus-logs --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable nvcr.io/nvidia/morpheus/morpheus:23.07-runtime \
	python ${MORPHEUS_ROOT}/examples/log_parsing/run.py \
	--num_threads 1 \
	--input_file ${MORPHEUS_ROOT}/models/datasets/validation-data/log-parsing-validation-data-input.csv \
	--output_file ./log-parsing-output.jsonlines \
	--model_vocab_hash_file=${MORPHEUS_ROOT}/models/data/bert-base-cased-hash.txt \
	--model_vocab_file=${MORPHEUS_ROOT}/models/training-tuning-scripts/sid-models/resources/bert-base-cased-vocab.txt \
	--model_seq_length=256 \
	--model_name log-parsing-onnx \
	--model_config_file=${MORPHEUS_ROOT}/models/log-parsing-models/log-parsing-config-20220418.json \
	--server_url <HOST SERVER IP>:8001