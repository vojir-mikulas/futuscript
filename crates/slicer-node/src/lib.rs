use futuscript_slicer::{Options, render};
use napi_derive::napi;

#[napi]
pub fn slice(source: String, filename: String, dev: bool, server: Option<bool>) -> napi::Result<String> {
    let server = server.unwrap_or(false);
    futuscript_slicer::slice(&source, &Options { filename: &filename, dev, server })
        .map_err(|d| napi::Error::from_reason(render(&d, &source, &filename)))
}
