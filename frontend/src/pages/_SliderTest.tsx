import { useState } from 'react'

import ProgressSlider from '@/shared/ui/ProgressSlider'

export default function SliderTest() {
  const [level, setLevel] = useState(90)
  const [friendship, setFriendship] = useState(4)

  const pyro = { main: '#ef4444', secondary: '#7f1d1d', accent: '#fca5a5' }

  return (
    <div className="p-12 space-y-4 max-w-2xl">
      <ProgressSlider
        label="Уровень персонажа"
        value={level}
        min={1}
        max={90}
        onChange={setLevel}
        icon="📊"
        colors={pyro}
      />
      <ProgressSlider
        label="Уровень дружбы"
        value={friendship}
        min={1}
        max={10}
        onChange={setFriendship}
        icon="💚"
        colors={pyro}
      />
    </div>
  )
}
