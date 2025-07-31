use axum::{body::Bytes, http::Method};
use base64::{Engine, engine::general_purpose};
use minio::s3::{
    client::Client, creds::StaticProvider, http::BaseUrl, segmented_bytes::SegmentedBytes,
    types::S3Api,
};
use uuid::Uuid;

#[derive(Clone)]
pub struct StorageService {
    client: Client,
    bucket_name: String,
}

impl StorageService {
    pub fn new(
        endpoint: &str,
        access_key: &str,
        secret_key: &str,
        bucket_name: String,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let base_url = endpoint.parse::<BaseUrl>()?;
        let static_provider = StaticProvider::new(access_key, secret_key, None);

        let client = Client::new(base_url, Some(Box::new(static_provider)), None, None)?;

        Ok(Self {
            client,
            bucket_name,
        })
    }

    pub async fn upload_completion_image(
        &self,
        user_id: &str,
        challenge_name: &str,
        image_data: &str, // base64 encoded image
    ) -> Result<String, Box<dyn std::error::Error>> {
        // Decode base64 image
        let image_bytes = general_purpose::STANDARD
            .decode(image_data)
            .map_err(|_| "Invalid base64 image data")?;

        if image_bytes.is_empty() {
            return Err("Image data cannot be empty".into());
        }

        let bytes = Bytes::from(image_bytes);
        let data = SegmentedBytes::from(bytes);

        // Generate unique filename
        let file_id = Uuid::new_v4();
        let object_name = format!("completions/{user_id}/{challenge_name}/{file_id}.jpg");

        // Upload the image
        let _response = self
            .client
            .put_object(&self.bucket_name, &object_name, data)
            .send()
            .await?;

        // Return the S3 URL
        Ok(format!("s3://{}/{object_name}", self.bucket_name))
    }

    // Generate a presigned URL for viewing an image
    pub async fn get_presigned_image_url(
        &self,
        s3_link: &str,
        expires_in_seconds: Option<u32>,
    ) -> Result<Option<String>, Box<dyn std::error::Error>> {
        if let Some(object_path) = s3_link.strip_prefix("s3://") {
            let mut parts = object_path.splitn(2, '/');
            let bucket = parts.next().ok_or("Invalid S3 link format")?;
            let object_key = parts.next().ok_or("Invalid S3 link format")?;

            // Default to 24 hours if not specified
            let expiry_duration = expires_in_seconds.unwrap_or(24 * 3600);

            let presigned_url_response = self
                .client
                .get_presigned_object_url(bucket, object_key, Method::GET)
                .expiry_seconds(expiry_duration)
                .send()
                .await?;

            Ok(Some(presigned_url_response.url))
        } else {
            Ok(None)
        }
    }

    // Get presigned URL for journal entries (shorter expiry)
    pub async fn get_journal_image_url(
        &self,
        s3_link: &str,
    ) -> Result<Option<String>, Box<dyn std::error::Error>> {
        self.get_presigned_image_url(s3_link, Some(2 * 3600)).await // 2 hours
    }
}
