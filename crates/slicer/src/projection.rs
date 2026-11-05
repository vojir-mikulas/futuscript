//! „Virtuální TypeScript": setup s G-kódy přepsanými na TS + výrazy ze šablony.
//! Pamatuje si mapování pozic zpátky do `.fs`, aby chyby z Oxc ukazovaly na správné místo.

#[derive(Default)]
pub struct Projection {
    pub text: String,
    /// (pozice v projekci, pozice ve zdroji, vygenerovaný text?)
    segments: Vec<(usize, usize, bool)>,
}

impl Projection {
    /// Text zkopírovaný ze zdroje od pozice `src_start`.
    pub fn src(&mut self, s: &str, src_start: usize) {
        if !s.is_empty() {
            self.segments.push((self.text.len(), src_start, false));
            self.text.push_str(s);
        }
    }

    /// Vygenerovaný text. Chyby uvnitř se zobrazí na pozici `src_at`.
    pub fn r#gen(&mut self, s: &str, src_at: usize) {
        if !s.is_empty() {
            self.segments.push((self.text.len(), src_at, true));
            self.text.push_str(s);
        }
    }

    pub fn len(&self) -> usize {
        self.text.len()
    }

    pub fn to_src(&self, pos: usize) -> usize {
        let i = self.segments.partition_point(|(p, _, _)| *p <= pos);
        match i.checked_sub(1).map(|i| self.segments[i]) {
            Some((p, s, false)) => s + (pos - p),
            Some((_, s, true)) => s,
            None => 0,
        }
    }
}
