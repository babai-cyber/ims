#!/bin/bash
# EC2 userdata — installs Docker and runs the IMS app
yum update -y
yum install -y docker git

systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Login to ECR
aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin ${ecr_registry}

# Clone repo and start
cd /home/ec2-user
git clone https://github.com/YOUR_GITHUB_USERNAME/ims.git
cd ims
docker-compose up -d

echo "IMS started successfully" >> /var/log/ims-startup.log
