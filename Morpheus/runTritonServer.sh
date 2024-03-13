#!/bin/bash

podman stop triton
podman rm triton

podman run -d --name triton --device nvidia.com/gpu=0 --gpus=1 --security-opt=label=disable \
	-p 0.0.0.0:8000:8000 -p 0.0.0.0:8001:8001 -p 0.0.0.0:8002:8002 \
	-v /morpheus/models:/models:Z nvcr.io/nvidia/tritonserver:23.07-py3 \
		tritonserver --model-repository=/models/triton-model-repo \
		--exit-on-error=false \
		--model-control-mode=explicit \
		--load-model log-parsing-onnx