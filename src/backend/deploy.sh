#!/bin/bash

# Arayanibul Backend - AWS EC2 Deployment Script
# Usage: ./deploy.sh [build|push|deploy|all]

set -e

# Configuration
AWS_REGION="${AWS_REGION:-eu-west-1}"
ECR_REGISTRY="${ECR_REGISTRY:-}"
IMAGE_NAME="arayanibul-api"
IMAGE_TAG="${IMAGE_TAG:-latest}"
EC2_HOST="${EC2_HOST:-}"
EC2_USER="${EC2_USER:-ec2-user}"
SSH_KEY="${SSH_KEY:-~/.ssh/arayanibul-ec2.pem}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Build Docker image
build() {
    log_info "Building Docker image..."
    cd API
    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
    cd ..
    log_info "Build complete: ${IMAGE_NAME}:${IMAGE_TAG}"
}

# Push to ECR (optional - if using ECR)
push_ecr() {
    if [ -z "$ECR_REGISTRY" ]; then
        log_warn "ECR_REGISTRY not set, skipping push"
        return
    fi

    log_info "Logging in to ECR..."
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

    log_info "Tagging image..."
    docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}

    log_info "Pushing to ECR..."
    docker push ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
    log_info "Push complete"
}

# Deploy to EC2 (direct Docker approach)
deploy_ec2() {
    if [ -z "$EC2_HOST" ]; then
        log_error "EC2_HOST not set"
        exit 1
    fi

    log_info "Deploying to EC2: ${EC2_HOST}"

    # Save and transfer image
    log_info "Saving Docker image..."
    docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip > /tmp/${IMAGE_NAME}.tar.gz

    log_info "Transferring to EC2..."
    scp -i ${SSH_KEY} /tmp/${IMAGE_NAME}.tar.gz ${EC2_USER}@${EC2_HOST}:/tmp/

    log_info "Loading and running on EC2..."
    ssh -i ${SSH_KEY} ${EC2_USER}@${EC2_HOST} << 'ENDSSH'
        # Load the image
        docker load < /tmp/arayanibul-api.tar.gz

        # Stop existing container
        docker stop arayanibul-api 2>/dev/null || true
        docker rm arayanibul-api 2>/dev/null || true

        # Run new container
        docker run -d \
            --name arayanibul-api \
            --restart unless-stopped \
            -p 5000:5000 \
            --env-file /home/ec2-user/.env \
            -v /home/ec2-user/uploads:/app/wwwroot/uploads \
            arayanibul-api:latest

        # Cleanup
        rm /tmp/arayanibul-api.tar.gz
        docker image prune -f

        echo "Deployment complete!"
ENDSSH

    # Cleanup local file
    rm /tmp/${IMAGE_NAME}.tar.gz
    log_info "Deployment complete!"
}

# Health check
health_check() {
    if [ -z "$EC2_HOST" ]; then
        log_error "EC2_HOST not set"
        exit 1
    fi

    log_info "Running health check..."
    response=$(curl -s -o /dev/null -w "%{http_code}" http://${EC2_HOST}:5000/health || echo "000")

    if [ "$response" == "200" ]; then
        log_info "Health check passed!"
    else
        log_error "Health check failed! Response: ${response}"
        exit 1
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build       Build Docker image"
    echo "  push        Push to ECR (requires ECR_REGISTRY)"
    echo "  deploy      Deploy to EC2 (requires EC2_HOST)"
    echo "  health      Run health check"
    echo "  all         Build and deploy"
    echo ""
    echo "Environment variables:"
    echo "  AWS_REGION      AWS region (default: eu-west-1)"
    echo "  ECR_REGISTRY    ECR registry URL"
    echo "  EC2_HOST        EC2 instance public IP/DNS"
    echo "  EC2_USER        SSH user (default: ec2-user)"
    echo "  SSH_KEY         Path to SSH key"
    echo "  IMAGE_TAG       Docker image tag (default: latest)"
}

# Main
case "${1:-}" in
    build)
        build
        ;;
    push)
        push_ecr
        ;;
    deploy)
        deploy_ec2
        ;;
    health)
        health_check
        ;;
    all)
        build
        deploy_ec2
        health_check
        ;;
    *)
        usage
        ;;
esac
