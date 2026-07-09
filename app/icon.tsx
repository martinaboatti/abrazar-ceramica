import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 280,
          background: '#c4704b',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '100px',
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
        }}
      >
        AC
      </div>
    ),
    { ...size }
  )
}