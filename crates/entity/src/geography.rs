use std::fmt;

use sea_orm::{
    ColIdx, ColumnType, DbErr, QueryResult, TryGetError, TryGetable, Value,
    sea_query::{ArrayType, Nullable, ValueType, ValueTypeErr},
};

/// WGS 84
pub const SRID: u32 = 4326;

#[derive(Copy, Clone, Debug, PartialEq)]
pub struct Point {
    pub lon: f64,
    pub lat: f64,
}

impl Point {
    #[must_use]
    pub const fn new(lon: f64, lat: f64) -> Self {
        Self { lon, lat }
    }

    #[must_use]
    pub fn to_ewkb_hex(self) -> String {
        let mut out = String::with_capacity(50);
        out.push_str("0101000020"); // little endian, Point, SRID present
        push_hex_le(&mut out, &SRID.to_le_bytes());
        push_hex_le(&mut out, &self.lon.to_le_bytes());
        push_hex_le(&mut out, &self.lat.to_le_bytes());
        out
    }

    pub fn from_ewkb_hex(hex: &str) -> Result<Self, PointError> {
        let bytes = decode_hex(hex)?;
        let mut cursor = Cursor::new(&bytes);

        let little_endian = match cursor.u8()? {
            0 => false,
            1 => true,
            _ => return Err(PointError("byte order flag is neither 0 nor 1")),
        };

        let type_id = cursor.u32(little_endian)?;
        if type_id & 0xC000_0000 != 0 {
            return Err(PointError("geometry has a Z or M dimension"));
        }
        if type_id & 0x00FF_FFFF != 1 {
            return Err(PointError("geometry is not a Point"));
        }

        if type_id & 0x2000_0000 != 0 {
            let srid = cursor.u32(little_endian)?;
            if srid != SRID {
                return Err(PointError("geometry is not in SRID 4326"));
            }
        }

        let lon = f64::from_bits(cursor.u64(little_endian)?);
        let lat = f64::from_bits(cursor.u64(little_endian)?);
        if !cursor.is_empty() {
            return Err(PointError("trailing bytes after the point"));
        }

        Ok(Self { lon, lat })
    }
}

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "SRID={SRID};POINT({} {})", self.lon, self.lat)
    }
}

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub struct PointError(&'static str);

impl fmt::Display for PointError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "invalid geography(Point, {SRID}): {}", self.0)
    }
}

impl std::error::Error for PointError {}

impl From<Point> for Value {
    fn from(point: Point) -> Self {
        Value::String(Some(point.to_ewkb_hex()))
    }
}

impl Nullable for Point {
    fn null() -> Value {
        Value::String(None)
    }
}

impl ValueType for Point {
    fn try_from(v: Value) -> Result<Self, ValueTypeErr> {
        match v {
            Value::String(Some(hex)) => Point::from_ewkb_hex(&hex).map_err(|_| ValueTypeErr),
            _ => Err(ValueTypeErr),
        }
    }

    fn type_name() -> String {
        stringify!(Point).to_owned()
    }

    fn array_type() -> ArrayType {
        ArrayType::String
    }

    fn column_type() -> ColumnType {
        ColumnType::custom("geography(Point, 4326)")
    }
}

impl TryGetable for Point {
    fn try_get_by<I: ColIdx>(res: &QueryResult, index: I) -> Result<Self, TryGetError> {
        let hex = String::try_get_by(res, index)?;
        Point::from_ewkb_hex(&hex).map_err(|e| TryGetError::DbErr(DbErr::Type(e.to_string())))
    }
}

fn push_hex_le(out: &mut String, bytes: &[u8]) {
    const DIGITS: &[u8; 16] = b"0123456789ABCDEF";
    for &byte in bytes {
        out.push(DIGITS[usize::from(byte >> 4)] as char);
        out.push(DIGITS[usize::from(byte & 0x0F)] as char);
    }
}

fn decode_hex(hex: &str) -> Result<Vec<u8>, PointError> {
    let (pairs, rest) = hex.as_bytes().as_chunks::<2>();
    if !rest.is_empty() {
        return Err(PointError("odd number of hex digits"));
    }
    pairs
        .iter()
        .map(|&[hi, lo]| Ok((nibble(hi)? << 4) | nibble(lo)?))
        .collect()
}

fn nibble(digit: u8) -> Result<u8, PointError> {
    match digit {
        b'0'..=b'9' => Ok(digit - b'0'),
        b'a'..=b'f' => Ok(digit - b'a' + 10),
        b'A'..=b'F' => Ok(digit - b'A' + 10),
        _ => Err(PointError("not a hex digit")),
    }
}

struct Cursor<'a>(&'a [u8]);

impl<'a> Cursor<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self(bytes)
    }

    fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    fn take<const N: usize>(&mut self) -> Result<[u8; N], PointError> {
        let (head, tail) = self
            .0
            .split_at_checked(N)
            .ok_or(PointError("ran out of bytes"))?;
        self.0 = tail;
        Ok(head.try_into().expect("split_at_checked yields N bytes"))
    }

    fn u8(&mut self) -> Result<u8, PointError> {
        Ok(self.take::<1>()?[0])
    }

    fn u32(&mut self, little_endian: bool) -> Result<u32, PointError> {
        let bytes = self.take::<4>()?;
        Ok(if little_endian {
            u32::from_le_bytes(bytes)
        } else {
            u32::from_be_bytes(bytes)
        })
    }

    fn u64(&mut self, little_endian: bool) -> Result<u64, PointError> {
        let bytes = self.take::<8>()?;
        Ok(if little_endian {
            u64::from_le_bytes(bytes)
        } else {
            u64::from_be_bytes(bytes)
        })
    }
}
