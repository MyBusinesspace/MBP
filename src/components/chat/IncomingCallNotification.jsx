import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Phone, Video, PhoneOff } from 'lucide-react';
import Avatar from '../Avatar';

export default function IncomingCallNotification({ caller, chatName, roomUrl, callType, onAccept, onDecline }) {
  const audioRef = useRef(null);
  const notificationSoundRef = useRef(null);

  useEffect(() => {
    console.log('🔔 [IncomingCallNotification] Mounted!', { caller, callType });

    // ✅ 1. Intentar reproducir sonido con múltiples estrategias
    const playSound = async () => {
      try {
        // Estrategia 1: Usar Audio API directa
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiqBzvLbjTUIFWm47OihUhMKTqHk9L9tIwk6jtTwvWYfBCZ+zPLTgjMGHnK47eeZUBIKSZ3j8sFsIQYuj9DwxnEiByV6yu3Vjz0JFW6+7eyjVhcLTaHf8r9tIgYuh9DwxnEjByZ6yu3VkD4KFXDB7u2kWBgLTKHe8sFsIwcqg8/uw3IlBy+Az/DShzkJFnDC7u6mWRkLTKLd8sJvJQcsgs/uw3ImCC+Bz/DShzkIFnLD7++nWxoMTaPd8sJvJQcsgs/uw3InCC+Bz/DUiTsJF3PE7/GpXBsMTaPd8sJwJQcsgs/uw3InCDCBz/DVijwJGHTF8PKqXRwNTqTe88NwJQctgs/uw3IoCDCCz/HWiTsJGHTG8PKrXx0NTqXe88NxJgctgs/uw3IoCDCCz/HWij0KGHTHb/+sYR4NTqXe88NxJgctgs/uw3IoCDCCz/HWij0KGHTHb/+sYR4NTqXe88NxJgctgs/uw3IoCDCCz/HWij0KGHTHb/+sYR4NTqXe88NxJgctgs/uw3IoCDCCz/HWij0KGHTHb/+sYR4NTqXe88NxJgctgs/uw3IoCDCCz/HWij0KGHTHb/+sYR4NTqXe88NxJgctgs/uw3IoCDCCz/HWij0KGHTHb/+sYR4NTqXe88NxJgctgs/uw3IoCDCCz/HWij0KGHTHb/+sYR4NTqXe88NxJgctgs/uw3IoCDCCz/HWij0KGHTHb/+sYR4NTqXe88NxJgctgs/uw3IoCDCCz/HWij0KGHTHb/+sYR4NTqXe88NxJgctgs/uw3IoCDCCz/HWij0KGHTHb/+sYR4NTqXe88NxJgctgs/uw3IoCDCCz/HWij0KGHTHb/+sYR4NTqXe88NxJgctgs/uw3IoCDCCz/HWij0KGHTHb/+sYR4N');
        await audio.play();
        console.log('✅ Sonido reproducido exitosamente');
      } catch (err) {
        console.warn('⚠️ No se pudo reproducir el sonido:', err.message);
      }
    };

    playSound();

    // ✅ 2. Repetir sonido cada 2 segundos
    const soundInterval = setInterval(playSound, 2000);

    // ✅ 3. Mostrar notificación del navegador con sonido
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification(`📞 Incoming ${callType} call`, {
            body: `${caller?.first_name || 'Someone'} is calling you`,
            icon: caller?.avatar_url || '/default-avatar.png',
            tag: 'incoming-call',
            requireInteraction: true,
            silent: false, // ✅ Importante: permitir sonido de la notificación
          });

          // Cerrar notificación cuando se acepte/rechace
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (err) {
          console.warn('Error mostrando notificación:', err);
        }
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(`📞 Incoming ${callType} call`, {
              body: `${caller?.first_name || 'Someone'} is calling you`,
              icon: caller?.avatar_url,
              requireInteraction: true,
              silent: false,
            });
          }
        });
      }
    }

    // ✅ 4. Vibrar el dispositivo (móviles)
    if ('vibrate' in navigator) {
      const vibratePattern = [200, 100, 200, 100, 200];
      navigator.vibrate(vibratePattern);
      
      // Repetir vibración cada 2 segundos
      const vibrateInterval = setInterval(() => {
        navigator.vibrate(vibratePattern);
      }, 2000);

      return () => {
        clearInterval(vibrateInterval);
        clearInterval(soundInterval);
        navigator.vibrate(0); // Detener vibración
      };
    }

    return () => {
      clearInterval(soundInterval);
    };
  }, [caller, callType, roomUrl]);

  const handleAccept = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onAccept(roomUrl);
  };

  const handleDecline = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onDecline();
  };

  const callerName = caller?.first_name 
    ? `${caller.first_name} ${caller.last_name || ''}`.trim() 
    : caller?.full_name || 'Someone';

  return (
    <>
      {/* ✅ Pantalla completa con animación llamativa */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 z-[9999] flex items-center justify-center"
      >
        {/* Patrón de fondo animado */}
        <div className="absolute inset-0 opacity-20">
          <motion.div 
            className="absolute inset-0"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        {/* Contenido */}
        <div className="relative z-10 text-center px-6 max-w-md">
          {/* Avatar con animación de pulso */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [1, 0.8, 1]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="mb-8"
          >
            <div className="w-40 h-40 mx-auto rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white relative">
              <Avatar
                name={callerName}
                src={caller?.avatar_url}
                className="w-full h-full"
              />
              {/* Anillo de pulso */}
              <motion.div
                className="absolute inset-0 border-4 border-white rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              />
            </div>
          </motion.div>

          {/* Icono de tipo de llamada */}
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 0.5, 
              repeat: Infinity,
              repeatDelay: 1
            }}
            className="mb-6"
          >
            {callType === 'video' ? (
              <Video className="w-16 h-16 text-white mx-auto drop-shadow-lg" />
            ) : (
              <Phone className="w-16 h-16 text-white mx-auto drop-shadow-lg" />
            )}
          </motion.div>

          {/* Información del llamador */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
              {callerName}
            </h2>
            <p className="text-2xl text-white/95 mb-2 font-medium">
              Incoming {callType} call
            </p>
            <p className="text-lg text-white/80 mb-10">
              {chatName}
            </p>
          </motion.div>

          {/* Botones de acción */}
          <div className="flex gap-8 justify-center">
            {/* Rechazar */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDecline}
              className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl flex items-center justify-center transition-all relative group"
            >
              <PhoneOff className="w-10 h-10 text-white" />
              <motion.div
                className="absolute inset-0 rounded-full bg-red-400"
                animate={{
                  scale: [1, 1.3],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
              />
            </motion.button>

            {/* Aceptar */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAccept}
              className="w-24 h-24 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl flex items-center justify-center transition-all relative"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(34, 197, 94, 0.7)',
                  '0 0 0 30px rgba(34, 197, 94, 0)',
                ]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            >
              <Phone className="w-10 h-10 text-white" />
            </motion.button>
          </div>

          {/* Etiquetas */}
          <div className="flex gap-8 justify-center mt-4">
            <span className="text-sm text-white/80 w-24 font-medium">Decline</span>
            <span className="text-sm text-white/80 w-24 font-medium">Accept</span>
          </div>
        </div>

        {/* Indicador visual pulsante en la parte superior */}
        <motion.div
          className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-lg rounded-full px-6 py-3 flex items-center gap-3"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          <motion.div
            className="w-3 h-3 bg-green-400 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
          />
          <span className="text-white font-semibold text-sm">INCOMING CALL</span>
        </motion.div>
      </motion.div>
    </>
  );
}