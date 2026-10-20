# temporizadores

Temporizadores de cocina: varios a la vez, cada uno con nombre ("arroz", "horno"), y alarma fuerte que suena hasta que alguien la detiene. Pensado para la tablet de la casa y el celular.

Publicado en http://192.168.1.4/temporizadores/

Para publicar:

```
rsync -a --delete --exclude .git --exclude README.md --exclude CLAUDE.md ~/proyectos/casa/temporizadores/ /var/www/temporizadores/
```
