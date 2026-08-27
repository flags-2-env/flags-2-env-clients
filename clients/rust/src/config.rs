#![forbid(unsafe_code)]

use crate::error::ClientError;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ClientConfig {
    pub base_url: String,
    pub bearer_token: Option<String>,
    pub max_response_bytes: usize,
}

impl ClientConfig {
    /// Build config from an explicit iterator of env pairs.
    /// Reading process environment is the caller's effect.
    pub fn from_env<I, K, V>(vars: I) -> Result<Self, ClientError>
    where
        I: IntoIterator<Item = (K, V)>,
        K: AsRef<str>,
        V: AsRef<str>,
    {
        let mut base = None;
        let mut bearer = None;
        for (key, value) in vars {
            match key.as_ref() {
                "FLAGS_2_ENV_API_BASE" => base = Some(value.as_ref().to_string()),
                "FLAGS_2_ENV_TOKEN" => bearer = Some(value.as_ref().to_string()),
                _ => {}
            }
        }
        let base_url = base
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .ok_or(ClientError::InvalidBase)?;
        Ok(Self {
            base_url,
            bearer_token: bearer.filter(|value| !value.is_empty()),
            max_response_bytes: 64 * 1024,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn from_env_reads_only_the_supplied_pairs() {
        let cfg = ClientConfig::from_env([
            ("FLAGS_2_ENV_API_BASE", "https://flags.example"),
            ("FLAGS_2_ENV_TOKEN", "secret"),
        ])
        .unwrap();
        assert_eq!(cfg.base_url, "https://flags.example");
        assert_eq!(cfg.bearer_token.as_deref(), Some("secret"));
    }

    #[test]
    fn from_env_does_not_read_process_environment() {
        let err = ClientConfig::from_env(Vec::<(&str, &str)>::new()).unwrap_err();
        assert!(matches!(err, ClientError::InvalidBase));
    }
}
